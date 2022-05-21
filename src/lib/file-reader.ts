import Bufferpack from 'bufferpack';
import _, { join, map, omit, take, takeRight } from 'lodash';

import {
  Constants,
  DicomDictionary,
  DicomDictionaryEntriesEnum,
  ExtraLengthVRs, KnownUIDs
} from '../constants/index';
import { ITagInfo } from '../types';

import { converters, convertValue } from './converter';
import { getEndianCharacter, getEndianPattern } from './helpers';

const print = console.log;
print(print);

const Uint8Helpers = {
  arrayToHex: (bytes: Uint8Array): readonly string[] => {
    return _.map(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  },

  splitArray: (array: Uint8Array, firstArrayElements: number): readonly [Uint8Array, Uint8Array] => {
    return [array.slice(0, firstArrayElements), array.slice(firstArrayElements)];
  },

  getArrayRange: (array: Uint8Array, start: number, range: number): Uint8Array => {
    return array.slice(start, start + range);
  },

  arrayToText: (array: Uint8Array): string => {
    return _.map(array, (byte) => {
      return String.fromCharCode(byte);
    }).join('');
  }
};

// const DicomHelpers = {
//   getTagProperty: (tag: string | readonly string[], property: keyof typeof DicomDictionaryEntriesEnum) => {
//     // Tag: VR, VM, Name, Retired, Keyword
//     const propertyIndex = DicomDictionaryEntriesEnum[property];
//     if (_.isString(tag)) {
//       return DicomDictionary[tag][propertyIndex];
//     }
//     return tag[propertyIndex];
//   }
// };


const readPreamble = (bytes: Uint8Array) => {
  const [fileMetaInformationHeader] = Uint8Helpers.splitArray(bytes, 132);
  const [preamble, magic] = Uint8Helpers.splitArray(fileMetaInformationHeader, 128);
  const magicAsText = Uint8Helpers.arrayToText(magic);
  if (magicAsText !== Constants.DICOM_MAGIC_PREFIX) {
    console.error(Constants.ERRORS.MISSING_DICOM_FILE_META_INFORMATION_HEADER);
    return { preamble: [], newCursorPosition: 0 };
  }
  return { preamble, newCursorPosition: 132 };
};

type StopWhenFunction = (group: number, VR?: string, length?: number) => boolean;

type IKnownTagValues = {
  readonly VR?: string,
  readonly length?: number,
  readonly rawValue?: Uint8Array,
  readonly value?: unknown,
}

type ITagValues = IKnownTagValues & {
  readonly [key: string]: unknown,
};

type ITag = ITagValues & {
  name: string,
  readonly representation: string,
  readonly representations: {
    group: number,
    element: number,
    hexGroup: string,
    hexElement: string,
    tuple: readonly string[],
    string: string,
    name: string,
  }
}

const createTag = (group: number, element: number, values: ITagValues): ITag => {
  const hexGroup = join(takeRight(`0000${group.toString(16)}`, 4), '');
  const hexElement = join(takeRight(`0000${element.toString(16)}`, 4), '');
  const stringRepresentation = `${hexGroup}${hexElement}`;
  const dicomDictionaryEntry = DicomDictionary[stringRepresentation];

  const representations = {
    group,
    element,
    hexGroup,
    hexElement,
    tuple: [hexGroup, hexElement],
    string: stringRepresentation,
    name: dicomDictionaryEntry[DicomDictionaryEntriesEnum.Name]
  };


  return {
    representations,
    ...omit(values, 'representations'),
    representation: stringRepresentation,
    VR: values.VR || dicomDictionaryEntry[DicomDictionaryEntriesEnum.VR],
    name: dicomDictionaryEntry[DicomDictionaryEntriesEnum.Name],
    VM: dicomDictionaryEntry[DicomDictionaryEntriesEnum.VM],
    keyword: dicomDictionaryEntry[DicomDictionaryEntriesEnum.Keyword],
    retired: dicomDictionaryEntry[DicomDictionaryEntriesEnum.Retired]
  };
};

// const getTagValue = (VR: string, value: Uint8Array) => {
//   const longVRs = ['OB', 'OD', 'OF', 'OW', 'UN', 'UT'];
//   const numberVRs =
//   const stringVRs = []
// }


const readDataset = (bytes: Uint8Array, cursor: number, isImplicitVRAssumed: boolean, isLittleEndian: boolean, stopWhen: StopWhenFunction) => {
  const data = Uint8Helpers.splitArray(bytes, cursor)[1];
  const isImplicitVR = _isImplicitVr(bytes, cursor, isImplicitVRAssumed, isLittleEndian, stopWhen);

  // // generator part
  const elementPattern = getEndianPattern(isLittleEndian, isImplicitVR);
  const extraLengthPattern = `${getEndianCharacter(isLittleEndian)}L`;

  const dataset: { [key: string]: ITag } = {};
  // eslint-disable-next-line functional/no-let
  let cursorPositionChange = 0;

  if (isImplicitVR) {
    console.error('not implemented yet, readDataset implicitVR');
  } else {
    const tagLength = 8;
    // eslint-disable-next-line functional/no-loop-statement,no-constant-condition
    while (true) {
      const tagInfo = Uint8Helpers.getArrayRange(data, cursorPositionChange, tagLength);
      if (tagInfo.length !== 8) {
        break;
      }
      const [group, elem, VR, length] = Bufferpack.unpack(elementPattern, tagInfo, 0);

      if (_.isFunction(stopWhen)) {
        if (stopWhen(group, VR.toString(), length)) {
          break;
        }
      }

      cursorPositionChange += tagLength;
      // eslint-disable-next-line functional/no-let
      let trueLength = length;

      if (_.includes(ExtraLengthVRs, VR)) {
        const extraLength = 4;
        const extraLengthInfo = Uint8Helpers.getArrayRange(data, cursorPositionChange, extraLength);
        const extraLengthUnpacked = Bufferpack.unpack(extraLengthPattern, extraLengthInfo, 0);
        trueLength = extraLengthUnpacked[0];
        cursorPositionChange += extraLength;
      }

      // reading values!
      if (trueLength !== parseInt('0xFFFFFFFF', 16)) {
        if (trueLength > 0) {
          const value = Uint8Helpers.getArrayRange(data, cursorPositionChange, trueLength);
          cursorPositionChange += trueLength;
          const tagInfo: ITagInfo = {
            VR,
            length: trueLength,
            rawValue: value
          };

          const tag = createTag(group, elem, {
            VR,
            length: trueLength,
            rawValue: value,
            value: convertValue(VR, tagInfo, isLittleEndian)
          });
          // eslint-disable-next-line functional/immutable-data
          dataset[tag.representation] = tag;
        }
      }
      console.error('not implemented yet, readDataset explicitVR');
    }
  }

  return {
    dataset,
    newCursorPosition: cursor + cursorPositionChange
  };
};

const _isImplicitVr = (
  bytes: Uint8Array,
  cursor: number,
  isImplicitVRAssumed = true,
  isLittleEndian = true,
  stopWhen: StopWhenFunction,
  isSequence = true
): boolean => {
  if (isSequence && isImplicitVRAssumed) {
    return true;
  }

  const data = Uint8Helpers.getArrayRange(bytes, cursor, 6);
  const [tagBytes, rawVR] = Uint8Helpers.splitArray(data, 4);

  if (rawVR.length < 2) {
    return isImplicitVRAssumed;
  }

  const foundImplicit = !(_.inRange(rawVR[0], 0x40, 0x5B) && (_.inRange(rawVR[1], 0x40, 0x5B)));

  if (foundImplicit !== isImplicitVRAssumed) {
    console.error('not implemented yet, foundImplicit !== isImplicitVrAssumed!', {
      tagBytes,
      foundImplicit,
      isImplicitVRAssumed,
      stopWhen,
      isLittleEndian
    });
  }
  return foundImplicit;
};

const _notGroup0000 = (group: number): boolean => {
  return group !== 0;
};

const _notGroup0002 = (group: number): boolean => {
  return group !== 2;
};

const readFileMetaInfo = (bytes: Uint8Array, cursor: number) => {
  return readDataset(bytes, cursor, false, true, _notGroup0002);
};

const readCommandSetElements = (bytes: Uint8Array, cursor: number) => {
  return readDataset(bytes, cursor, false, true, _notGroup0000);
};

const getPydicomLikeFileTagNotation = (fileMetaInfo: { [key: string]: ITag }) => {
  const paddingLimit = 40;
  map(fileMetaInfo, (tag) => {
    console.log(` (${tag.representations.hexGroup}, ${tag.representations.hexElement}) ${join(take(tag.name, paddingLimit), '').padEnd(paddingLimit, ' ')} ${tag.VR}: ${tag.value}`);
  });
};

// const guess
console.log({ getPydicomLikeFileTagNotation });

const readOrGuessIsImplicitVrAndIsLittleEndian = (bytes: Uint8Array, cursor: number, transferSyntax: ITag): {isImplicitVR: boolean, isLittleEndian: boolean} => {
  const getReturnObject = (isImplicitVR?: boolean, isLittleEndian?: boolean) => {
    return {
      isImplicitVR: _.isUndefined(isImplicitVR) ? true : isImplicitVR,
      isLittleEndian: _.isUndefined(isLittleEndian) ? true : isLittleEndian
    }
  }
  const peek = Uint8Helpers.getArrayRange(bytes, cursor, 1);

  if (peek.length === 0) {
    return getReturnObject();
  }

  if (!transferSyntax) {
    const data = Uint8Helpers.getArrayRange(bytes, cursor, 6);
    const [group, _, VR] = Bufferpack.unpack('<HH2s', data);
    if (converters[VR]) {
      if (group >= 1024) {
        return getReturnObject(false, false)
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
      return getReturnObject(false, true)
  }

  return getReturnObject();
};

const readFile = async (file: File) => {
  const extension = [...file.name.split('.')].pop();
  const data = await file.arrayBuffer();
  const bytes = new Uint8Array(data);

  const {
    preamble,
    newCursorPosition: cursorAfterPreamble
  } = readPreamble(bytes);
  const {
    dataset: fileMetaInfo,
    newCursorPosition: cursorAfterFileMeta
  } = readFileMetaInfo(bytes, cursorAfterPreamble);
  const {
    dataset: commandSetElements,
    newCursorPosition: datasetStart
  } = readCommandSetElements(bytes, cursorAfterFileMeta);

  const peek = Uint8Helpers.getArrayRange(bytes, datasetStart, 1);

  const transferSyntax = _.get(fileMetaInfo, '00020010'); // TransferSyntaxUID
  console.log({transferSyntax});
  const {isImplicitVR, isLittleEndian} = readOrGuessIsImplicitVrAndIsLittleEndian(bytes, datasetStart, transferSyntax);
  console.log({
    file,
    extension,
    preamble,
    cursorAfterPreamble,
    fileMetaInfo,
    commandSetElements,
    datasetStart,
    peek,
    isImplicitVR,
    isLittleEndian,
    transferSyntax,
    readOrGuessIsImplicitVrAndIsLittleEndian
  });
  console.log({isImplicitVR, isLittleEndian});


};

export { readFile };
