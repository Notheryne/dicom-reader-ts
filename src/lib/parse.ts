import Bufferpack from 'bufferpack';
import _, { get, inRange, isFunction, isNull, parseInt } from 'lodash';

import { Constants, ExtraLengthVRs, KnownUIDs } from '../constants';
import { Dataset, FullDataset, ITag, StopWhenFunction } from '../types';

import { converters, convertValue } from './converter';
import {
  getEndianCharacter,
  getEndianPattern,
  getSafeKey,
  notGroup0000,
  notGroup0002,
  Uint8Helpers,
} from './helpers';
import { createTag, getTagInfo } from './helpers/tag-helpers';

console.log({
  getEndianCharacter,
  getEndianPattern,
  getSafeKey,
  notGroup0000,
  notGroup0002,
  Uint8Helpers,
});
const readPreamble = (bytes: Uint8Array) => {
  const [fileMetaInformationHeader] = Uint8Helpers.splitArray(bytes, 132);
  const [preamble, magic] = Uint8Helpers.splitArray(
    fileMetaInformationHeader,
    128
  );
  const magicAsText = Uint8Helpers.arrayToText(magic);
  if (magicAsText !== Constants.DICOM_MAGIC_PREFIX) {
    console.error(Constants.ERRORS.MISSING_DICOM_FILE_META_INFORMATION_HEADER);
    return { preamble: [], newCursorPosition: 0 };
  }
  return { preamble, newCursorPosition: 132 };
};

const isImplicitVr = (
  bytes: Uint8Array,
  cursor: number,
  isImplicitVRAssumed = true,
  isLittleEndian = true,
  isSequence = true,
  stopWhen?: StopWhenFunction
): boolean => {
  if (isSequence && isImplicitVRAssumed) {
    return true;
  }

  const data = Uint8Helpers.getArrayRange(bytes, cursor, 6);
  const [tagBytes, rawVR] = Uint8Helpers.splitArray(data, 4);

  if (rawVR.length < 2) {
    return isImplicitVRAssumed;
  }

  const foundImplicit = !(
    _.inRange(rawVR[0], 0x40, 0x5b) && _.inRange(rawVR[1], 0x40, 0x5b)
  );

  if (foundImplicit !== isImplicitVRAssumed) {
    const endianCharacter = isLittleEndian ? '<' : '>';
    const tag = Bufferpack.unpack(`${endianCharacter}HH`, tagBytes);
    const vr = new TextDecoder().decode(rawVR);

    if (isFunction(stopWhen) && stopWhen(tag[0], vr, 0)) {
      return foundImplicit;
    }

    if (foundImplicit && isSequence) {
      return true;
    }
  }

  return foundImplicit;
};

const readOrGuessIsImplicitVrAndIsLittleEndian = (
  bytes: Uint8Array,
  cursor: number,
  transferSyntax: ITag<string>
): { isImplicitVR: boolean; isLittleEndian: boolean } => {
  const getReturnObject = (
    isImplicitVR?: boolean,
    isLittleEndian?: boolean
  ) => {
    return {
      isImplicitVR: _.isUndefined(isImplicitVR) ? true : isImplicitVR,
      isLittleEndian: _.isUndefined(isLittleEndian) ? true : isLittleEndian,
    };
  };
  const peek = Uint8Helpers.getArrayRange(bytes, cursor, 1);

  if (peek.length === 0) {
    return getReturnObject();
  }

  if (!transferSyntax) {
    const data = Uint8Helpers.getArrayRange(bytes, cursor, 6);
    const [group, , VR] = Bufferpack.unpack('<HH2s', data);

    if (converters[VR]) {
      if (group >= 1024) {
        return getReturnObject(false, false);
      }
      return getReturnObject(false, true);
    }
    return getReturnObject();
  }

  switch (transferSyntax.value) {
    case KnownUIDs.ImplicitVRLittleEndian:
      return getReturnObject();
    case KnownUIDs.ExplicitVRLittleEndian:
      return getReturnObject(false, true);
    case KnownUIDs.ExplicitVRBigEndian:
      return getReturnObject(false, false);
    case KnownUIDs.DeflatedExplicitVRLittleEndian:
      console.error('deflating zipped files not implemented yet');
      break;
    default:
      return getReturnObject(false, true);
  }

  return getReturnObject();
};

const unpack = (
  data: Uint8Array,
  tagData: Uint8Array,
  elementPattern: string,
  isImplicitVR: boolean,
  isLittleEndian: boolean,
  cursor: number
) => {
  const isUppercaseLetter = (char: string) =>
    inRange(char.charCodeAt(0), 'A'.charCodeAt(0), 'Z'.charCodeAt(0));

  const defaultTagLength = 8;
  const extraLengthPattern = `${getEndianCharacter(isLittleEndian)}L`;

  if (isImplicitVR) {
    const [group, elem, length] = Bufferpack.unpack(elementPattern, tagData);
    return [group, elem, null, length, defaultTagLength];
  }
  const [group, elem, VR, length] = Bufferpack.unpack(elementPattern, tagData);

  if (!(isUppercaseLetter(VR[0]) && isUppercaseLetter(VR[1]))) {
    const implicitVRElementPattern = getEndianPattern(isLittleEndian, true);
    const [group, elem, length] = Bufferpack.unpack(
      implicitVRElementPattern,
      tagData
    );
    return [group, elem, null, length, defaultTagLength];
  } else {
    if (_.includes(ExtraLengthVRs, VR)) {
      const extraLength = 4;
      const extraLengthInfo = Uint8Helpers.getArrayRange(
        data,
        cursor + defaultTagLength,
        extraLength
      );
      const [trueLength] = Bufferpack.unpack(
        extraLengthPattern,
        extraLengthInfo,
        0
      );
      return [group, elem, VR, trueLength, defaultTagLength + extraLength];
    }
  }

  return [group, elem, VR, length, defaultTagLength];
};

const readDataset = (
  bytes: Uint8Array,
  cursor: number,
  isImplicitVRAssumed: boolean,
  isLittleEndian: boolean,
  stopWhen?: StopWhenFunction
) => {
  const data = Uint8Helpers.splitArray(bytes, cursor)[1];
  const isImplicitVR = isImplicitVr(
    bytes,
    cursor,
    isImplicitVRAssumed,
    isLittleEndian,
    true,
    stopWhen
  );

  const elementPattern = getEndianPattern(isLittleEndian, isImplicitVR);

  const dataset: Dataset = {};
  // eslint-disable-next-line functional/no-let
  let cursorPositionChange = 0;
  const tagLength = 8;

  // eslint-disable-next-line functional/no-loop-statement,no-constant-condition
  while (true) {
    const tagData = Uint8Helpers.getArrayRange(
      data,
      cursorPositionChange,
      tagLength
    );

    if (tagData.length !== 8) {
      break;
    }

    const [group, elem, VR, length, cursorChange] = unpack(
      data,
      tagData,
      elementPattern,
      isImplicitVR,
      isLittleEndian,
      cursorPositionChange
    );

    if (_.isFunction(stopWhen)) {
      if (stopWhen(group, VR, length)) {
        break;
      }
    }

    cursorPositionChange += cursorChange;

    if (length !== parseInt('0xFFFFFFFF', 16)) {
      if (length > 0) {
        const value = Uint8Helpers.getArrayRange(
          data,
          cursorPositionChange,
          length
        );
        cursorPositionChange += length;

        if (VR !== 'NONE') {
          const tagInfo = getTagInfo(value, length, group, elem, VR);
          const tag = createTag(group, elem, {
            VR,
            length,
            rawValue: value,
            value: convertValue(VR || tagInfo.VR, tagInfo, isLittleEndian),
          });

          // eslint-disable-next-line functional/immutable-data
          dataset[getSafeKey(dataset, tag.keyword)] = tag;
        }
      }
    } else {
      const newVR = VR === 'UN' ? 'SQ' : VR;

      if (isNull(newVR)) {
        console.error('Unhandled null VR, filereader.py:247');
      }

      if (newVR === 'SQ') {
        console.error('Unhandled SQ, filereader.py:259');
      } else {
        console.error('Unhandled undefined length value, filereader.py:274');
      }
    }
  }

  return {
    dataset,
    newCursorPosition: cursor + cursorPositionChange,
  };
};

const readFileMetaInfo = (bytes: Uint8Array, cursor: number) => {
  return readDataset(bytes, cursor, false, true, notGroup0002);
};

const readCommandSetElements = (bytes: Uint8Array, cursor: number) => {
  return readDataset(bytes, cursor, false, true, notGroup0000);
};

const parseFile = (bytes: Uint8Array) => {
  const { newCursorPosition: cursorAfterPreamble } = readPreamble(bytes);
  const { dataset: fileMetaInfo, newCursorPosition: cursorAfterFileMeta } =
    readFileMetaInfo(bytes, cursorAfterPreamble);
  const { dataset: commandSetElements, newCursorPosition: datasetStart } =
    readCommandSetElements(bytes, cursorAfterFileMeta);

  // const peek = Uint8Helpers.getArrayRange(bytes, datasetStart, 1);

  const transferSyntax = get(fileMetaInfo, '00020010'); // TransferSyntaxUID

  const { isImplicitVR, isLittleEndian } =
    readOrGuessIsImplicitVrAndIsLittleEndian(
      bytes,
      datasetStart,
      transferSyntax
    );

  const { dataset } = readDataset(
    bytes,
    datasetStart,
    isImplicitVR,
    isLittleEndian
  );

  return {
    ...dataset,
    ...fileMetaInfo,
    ...commandSetElements,
    isLittleEndian,
    isImplicitVR,
  } as FullDataset;
};

export { parseFile };
