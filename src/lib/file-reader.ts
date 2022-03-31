import Bufferpack from 'bufferpack';
import _ from 'lodash';

import {
  Constants,
  DicomDictionary,
  DicomDictionaryEntriesEnum
} from '../constants/index';


const Uint8Helpers = {
  arrayToHex: (bytes: Uint8Array): readonly string[] => {
    // noinspection TypeScriptValidateJSTypes
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

const DicomHelpers = {
  getTagProperty: (tag: string | readonly string[], property: keyof typeof DicomDictionaryEntriesEnum) => {
    // Tag: VR, VM, Name, Retired, Keyword
    const propertyIndex = DicomDictionaryEntriesEnum[property];
    if (_.isString(tag)) {
      return DicomDictionary[tag][propertyIndex];
    }
    return tag[propertyIndex];
  }
};


const readPreamble = (bytes: Uint8Array) => {
  const [fileMetaInformationHeader] = Uint8Helpers.splitArray(bytes, 132);
  const [preamble, magic] = Uint8Helpers.splitArray(fileMetaInformationHeader, 128);
  const magicAsText = Uint8Helpers.arrayToText(magic);
  if (magicAsText !== Constants.DICOM_MAGIC_PREFIX) {
    // throw TypeError();
    console.error(Constants.ERRORS.MISSING_DICOM_FILE_META_INFORMATION_HEADER);
    return { preamble: [], cursor: 0 };
  }
  return { preamble, cursor: 132 };
};

type ITag = {
  readonly name: string,
  readonly tag: string
  readonly value?: any,
}

type StopWhenFunction = (group: number, VR?: string, length?: number) => boolean;

const createTag = (identifier: string | readonly string[], value?: any): ITag => {
  const identifierToUse = _.isString(identifier) ? identifier : identifier.join('');
  const tagInfo = DicomDictionary[identifierToUse];

  return {
    value,
    name: DicomHelpers.getTagProperty(tagInfo, 'Name'),
    tag: identifierToUse
  };
};

const getEndianCharacter = (isLittleEndian: boolean) => {
  return isLittleEndian ? '<' : '>';
};

const getEndianPattern = (isLittleEndian: boolean, isImplicitVR: boolean) => {
  return `${getEndianCharacter(isLittleEndian)}${isImplicitVR ? 'HHL' : 'HH2sH'}`;
};

console.log({ createTag, getEndianPattern });

const readDataset = (bytes: Uint8Array, cursor: number, isImplicitVRAssumed: boolean, isLittleEndian: boolean, stopWhen?: StopWhenFunction) => {
  const data = Uint8Helpers.splitArray(bytes, cursor)[1];
  const isImplicitVR = _isImplicitVr(bytes, cursor, isImplicitVRAssumed, isLittleEndian, _notGroup0002);

  console.log({ data, isImplicitVR, stopWhen });

  // // generator part
  const elementPattern = getEndianPattern(isLittleEndian, isImplicitVR);
  const extraLengthPattern = !isImplicitVR ? `${elementPattern}L` : null;
  console.log({ extraLengthPattern, isImplicitVR, stopWhen });
  // const bytesChunks = _.chunk(data, 8);
  // const lastChunkLength = bytesChunks[bytesChunks.length - 1].length;
  // const safeBytesChunks = (lastChunkLength === 8 ? bytesChunks : bytesChunks.slice(0, -1)).slice(0, 128);

  if (isImplicitVR) {
    console.error('not implemented yet, readDataset implicitVR');

    // const tags = [createTag(Constants.SPECIFIC_CHARACTER_SET_TAG), ..._.forEach(safeBytesChunks, (chunk: readonly number[]) => {
    //   const [group, element, length] = Bufferpack.unpack(elementPattern, chunk, 0);
    //   if (stopWhen) {
    //     console.error('stopWhen not implemented yet in readDatabase');
    //   }
    //   console.log({ group, element, length });
    // })];
  } else {
    const tagLength = 8;
    // eslint-disable-next-line functional/no-let
    let index = 0;
    // eslint-disable-next-line functional/no-loop-statement,no-constant-condition
    while (true) {
      const tagInfo = Uint8Helpers.getArrayRange(data, index, tagLength);
      if (tagInfo.length !== 8) {
        break;
      }
      const [group, elem, VR, length] = Bufferpack.unpack(elementPattern, tagInfo, 0);
      console.log({group, elem, VR, length, index});
      if (_.isFunction(stopWhen)) {
        if (stopWhen(group, VR.toString(), length)) {
          console.log('stop', {group, VR, length, index});
          break;
        }

      }
      if (length !== 0) {
        index = index + length + tagLength;
      } else {
        index = index + 14;
      }

    }
    // const result = _.reduce(data, (acc: { readonly seek: number, readonly isSeekingValue: boolean, readonly chunk: readonly number[], readonly tagInfo: readonly number[], readonly result: readonly number[] }, element, index) => {
    //
    //   return acc;
    // }, { seek: 0, isSeekingValue: false, chunk: [], tagInfo: [], result: [] });
    // console.log({result});
    // _.forEach(safeBytesChunks, (chunk: readonly number[]) => {
    //   const [group, elem, VR, length] = Bufferpack.unpack(elementPattern, chunk, 0);
    //   console.log({group, elem, VR, length, chunk});
    //
    // })
    console.error('not implemented yet, readDataset explicitVR');
    // _.forEach(safeBytesChunks, (chunk: readonly number[]) => {
    //   const [group, elem, VR, length] = Bufferpack.unpack(elementPattern, chunk, 0);
    //   console.log({group, elem, VR, length})
    // });
  }

};

const _notGroup0002 = (group: number): boolean => {
  return group !== 2;
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
  console.log({ foundImplicit, isImplicitVRAssumed });
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

const readFileMetaInfo = (bytes: Uint8Array, cursor: number) => {
  // const data = Uint8Helpers.splitArray(bytes, cursor)[1];
  // console.log({ data });
  const dataset = readDataset(bytes, cursor, false, true, _notGroup0002);
  console.log({ dataset });
  // const fileMeta = ;
  // console.log({ dataset });
  return '';
};

const readFile = async (file: File) => {
  const extension = [...file.name.split('.')].pop();
  console.log({ file, extension });
  const data = await file.arrayBuffer();
  const bytes = new Uint8Array(data);

  const { preamble, cursor: cursorAfterPreamble } = readPreamble(bytes);
  console.log({ preamble, cursorAfterPreamble });
  // if (!preamble || !remainingBytes) {
  //   return;
  // }

  const fileMetaInfo = readFileMetaInfo(bytes, cursorAfterPreamble);
  console.log({ fileMetaInfo });
  // const fileMetaInfo = readFileMetaInfo(remainingBytes);

  // console.log({ preamble, file_meta_info: fileMetaInfo });

};

export { readFile };