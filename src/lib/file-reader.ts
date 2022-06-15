import Bufferpack from 'bufferpack';
// import { gdcm } from 'gdcmconv';
import _, {
  find, floor, includes,
  isArray,
  isEqual, isNumber, isString,
  join, keys,
  map,
  omit,
  take,
  takeRight, toLower
} from 'lodash';

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

type IKnownTagValues<T> = {
  readonly VR: string,
  readonly length: number,
  readonly rawValue: Uint8Array,
  readonly value: T,
}

type ITagValues<T> = IKnownTagValues<T> & {
  readonly [key: string]: unknown,
};

type ITag<T> = ITagValues<T> & {
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
  },
  keyword: string;
}

type Dataset = Record<string, ITag<any>>

const getHexRepresentation = (group: number, element: number) => {
  const hexGroup = join(takeRight(`0000${group.toString(16)}`, 4), '');
  const hexElement = join(takeRight(`0000${element.toString(16)}`, 4), '');
  return { hexGroup, hexElement };
};

const createTag = (group: number, element: number, values: ITagValues<any>): ITag<any> => {
  const { hexGroup, hexElement } = getHexRepresentation(group, element);
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
    ...values,
    representations,
    representation: stringRepresentation,
    VR: values.VR || dicomDictionaryEntry[DicomDictionaryEntriesEnum.VR],
    name: dicomDictionaryEntry[DicomDictionaryEntriesEnum.Name],
    VM: dicomDictionaryEntry[DicomDictionaryEntriesEnum.VM],
    keyword: dicomDictionaryEntry[DicomDictionaryEntriesEnum.Keyword],
    retired: dicomDictionaryEntry[DicomDictionaryEntriesEnum.Retired]
  } as ITag<typeof values.value>;
};

const getTagInfo = (rawValue: Uint8Array, length: number, group?: number, element?: number, VR?: string): ITagInfo => {
  if (!group && !element && !VR) {
    // eslint-disable-next-line functional/no-throw-statement
    throw Error();
  }

  if (VR) {
    return {
      rawValue,
      length,
      VR
    };
  }
  const { hexGroup, hexElement } = getHexRepresentation(group!, element!);
  // console.log({group, element, VR, hexGroup, hexElement, tag: `${hexGroup}${hexElement}`, tagDD: DicomDictionary[`${hexGroup}${hexElement}`]});
  const guessVR = DicomDictionary[`${hexGroup}${hexElement}`][DicomDictionaryEntriesEnum.VR];
  return {
    rawValue,
    length,
    VR: guessVR
  };
};
// const getTagValue = (VR: string, value: Uint8Array) => {
//   const longVRs = ['OB', 'OD', 'OF', 'OW', 'UN', 'UT'];
//   const numberVRs =
//   const stringVRs = []
// }


const readDataset = (bytes: Uint8Array, cursor: number, isImplicitVRAssumed: boolean, isLittleEndian: boolean, stopWhen?: StopWhenFunction) => {
  const data = Uint8Helpers.splitArray(bytes, cursor)[1];
  const isImplicitVR = _isImplicitVr(bytes, cursor, isImplicitVRAssumed, isLittleEndian, true, stopWhen);

  // // generator part
  const elementPattern = getEndianPattern(isLittleEndian, isImplicitVR);
  const extraLengthPattern = `${getEndianCharacter(isLittleEndian)}L`;

  const dataset: Dataset = {};
  // eslint-disable-next-line functional/no-let
  let cursorPositionChange = 0;
  const tagLength = 8;

  if (isImplicitVR) {
    // eslint-disable-next-line functional/no-loop-statement,no-constant-condition
    while (true) {
      const tagInfo = Uint8Helpers.getArrayRange(data, cursorPositionChange, tagLength);

      if (tagInfo.length !== 8) {
        break;
      }
      const [group, elem, length] = Bufferpack.unpack(elementPattern, tagInfo, 0);

      if (_.isFunction(stopWhen)) {
        if (stopWhen(group, undefined, length)) {
          break;
        }
      }

      cursorPositionChange += 8;
      if (length !== parseInt('0xFFFFFFFF', 16)) {
        if (length > 0) {
          const value = Uint8Helpers.getArrayRange(data, cursorPositionChange, length);
          cursorPositionChange += length;
          const tagInfo = getTagInfo(value, length, group, elem);

          const tag = createTag(group, elem, {
            length,
            rawValue: value,
            value: convertValue(tagInfo.VR, tagInfo, isLittleEndian),
            VR: ''
          });
          dataset[tag.representation] = tag;
        } else {
          console.log('len 0');
        }
      } else {
        console.log('len 0 hex');
      }
    }
  } else {
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
          const tagInfo: ITagInfo = getTagInfo(value, length, group, elem, VR);

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

const getPydicomLikeFileTagNotation = (dataset: Dataset, skip = ['7fe00010']) => {
  const paddingLimit = 40;
  map(omit(dataset, ...skip), (tag: ITag<any>) => {
    console.log(` (${tag.representations.hexGroup}, ${tag.representations.hexElement}) ${join(take(tag.name, paddingLimit), '').padEnd(paddingLimit, ' ')} ${tag.VR}: ${tag.value}`);
  });
};

// const guess
console.log({ getPydicomLikeFileTagNotation });

const readOrGuessIsImplicitVrAndIsLittleEndian = (bytes: Uint8Array, cursor: number, transferSyntax: ITag<string>): { isImplicitVR: boolean, isLittleEndian: boolean } => {
  const getReturnObject = (isImplicitVR?: boolean, isLittleEndian?: boolean) => {
    return {
      isImplicitVR: _.isUndefined(isImplicitVR) ? true : isImplicitVR,
      isLittleEndian: _.isUndefined(isLittleEndian) ? true : isLittleEndian
    };
  };
  const peek = Uint8Helpers.getArrayRange(bytes, cursor, 1);

  if (peek.length === 0) {
    return getReturnObject();
  }

  if (!transferSyntax) {
    const data = Uint8Helpers.getArrayRange(bytes, cursor, 6);
    const [group, something, VR] = Bufferpack.unpack('<HH2s', data);
    console.log({ something });
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

const getMatchedTag = (representation: string | (number | string)[], tag: ITag<any>) => {
  if (isArray(representation)) {
    if (isNumber(representation[0])) {
      const { group, element } = tag.representations;
      return isEqual([group, element], representation);
    } else if (isString(representation[0])) {
      return isEqual(map(tag.representations.tuple, toLower), map(representation, toLower));
    }
  } else {
    if (toLower(tag.name) === toLower(representation) || toLower(tag.keyword) === toLower(representation)) {
      return true;
    }
    const transformedRepresentation = toLower(representation).replace(/(\(|,|\s)/g, '');
    return isEqual(toLower(tag.representation), transformedRepresentation);
  }
  return false;
};

const getTagValue = (dataset: Dataset, representation: string | (number | string)[]) => {
  if (isArray(representation) && representation.length !== 2) {
    console.error('Wrong tag identifier supplied. If passed as a tuple it must have 2 elements', { tag: representation });
    return null;
  }

  return find(dataset, (tag) => {
    return getMatchedTag(representation, tag);
  });
};

const getExpectedLength = (rows: number, columns: number, samplesPerPixel: number, bitsAllocated: number, photometricInterpretation: string, unit = 'bytes') => {
  const baseLength = rows * columns * samplesPerPixel;// * number of frames (?)
  if (unit === 'pixels') {
    return baseLength;
  }

  const bytesNeeded = bitsAllocated === 1 ? floor(baseLength / 8) + (baseLength % 8 === 0 ? 0 : 1) : baseLength * floor(bitsAllocated / 8);
  if (photometricInterpretation === 'YBR_FULL_422') {
    return floor(bytesNeeded / 3) * 2;
  }
  return bytesNeeded;
};


const getPixelTypeConstructor = (bitsAllocated: number, pixelRepresentation: number, isLittleEndian = true) => {
  if (bitsAllocated < 0 || bitsAllocated !== 1 || bitsAllocated % 8 !== 0) {
    console.error('Cant get pixel type', {bitsAllocated, pixelRepresentation, isLittleEndian});
  }
  const representations: {[key: number]: string} = {
    0: 'uint',
    1: 'int'
  }
  const typeName = bitsAllocated === 1
    ? 'uint8'
    : `${representations[pixelRepresentation]}${bitsAllocated}`

  const types: {[key: string]: TypedArrayConstructor} = {
    'uint8': Uint8Array,
    'uint16': Uint16Array,
    'int8': Int8Array,
    'int16': Int16Array
  }

  return types[typeName];
};

const convertPixelDataToType = (pixelData: Uint8Array, pixelTypeConstructor: TypedArrayConstructor) => {
  return new pixelTypeConstructor(pixelData.buffer);
}

const convertPixelData = (dataset: Dataset, isLittleEndian = true) => {
  console.log({ dataset });
  // getPydicomLikeFileTagNotation(dataset);
  const transferSyntaxUid = getTagValue(dataset, 'TransferSyntaxUID');
  const defaultPixelData = getTagValue(dataset, 'Pixel Data');
  const floatPixelData = getTagValue(dataset, 'FloatPixelData');
  const doubleFloatPixelData = getTagValue(dataset, 'DoubleFloatPixelData');
  const bitsAllocated = getTagValue(dataset, '00280100');
  const bitsStored = getTagValue(dataset, '00280101');
  const highBit = getTagValue(dataset, '00280102');
  const rows = getTagValue(dataset, '00280010');
  const columns = getTagValue(dataset, '00280011');
  const samplesPerPixel = getTagValue(dataset, '00280002');
  const photometricInterpretation = getTagValue(dataset, '00280004');
  const pixelRepresentation = getTagValue(dataset, '00280103');

  const [pixelData, pixelDataKeyword] = [defaultPixelData, 'PixelData'] || [floatPixelData, 'FloatPixelData'] || [doubleFloatPixelData, 'DoubleFloatPixelData'];

  if (!transferSyntaxUid || !pixelData || !bitsAllocated || !bitsStored || !highBit || !rows || !columns || !samplesPerPixel || !photometricInterpretation || !pixelDataKeyword || !pixelRepresentation) {
    return;
  }

  const expectedLength = getExpectedLength(rows.value, columns.value, samplesPerPixel.value, bitsAllocated.value, photometricInterpretation.value);
  const actualLength = pixelData.length;
  const paddedExpectedLength = expectedLength + expectedLength % 2;
  console.log({ expectedLength, actualLength, paddedExpectedLength });

  if (bitsAllocated.value === 1) {
    const numberOfPixels = getExpectedLength(rows.value, columns.value, samplesPerPixel.value, bitsAllocated.value, photometricInterpretation.value, 'pixels');
    console.error('Not implemented yet, bitAllocated === 1.', { numberOfPixels });
  } else {
    const data = Uint8Helpers.getArrayRange(pixelData.rawValue, 0, expectedLength);
    if (photometricInterpretation.value === 'YBR_FULL_422') {
      console.error('not implemented yet, photometricInterpretation === YBR_FULL_422');
    }
    const pixelTypeConstructor = getPixelTypeConstructor(bitsAllocated.value, pixelRepresentation.value, isLittleEndian);
    console.log({ data, new: convertPixelDataToType(data, pixelTypeConstructor) });
  }
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
  console.log({ transferSyntax });
  const {
    isImplicitVR,
    isLittleEndian
  } = readOrGuessIsImplicitVrAndIsLittleEndian(bytes, datasetStart, transferSyntax);
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
  console.log('@@@@@ READING DATASET @@@@@@');
  const { dataset } = readDataset(bytes, datasetStart, isImplicitVR, isLittleEndian);
  const fullDataset = {
    ...dataset,
    ...fileMetaInfo,
    ...commandSetElements
  };
  convertPixelData(fullDataset, isLittleEndian);

  return fullDataset;
};

export { readFile, getTagValue };
