import Bufferpack from 'bufferpack';
import _, { map, trim, trimEnd } from 'lodash';

import { ITagInfo } from '../types';

import {
  decodeToText,
  getEndianCharacter,
  handleDA,
  handleTM,
} from './helpers';
import { getMultiString, handleMultiString } from './multi-string';

const convertNumbers =
  (format: string) => (rawValue: Uint8Array, isLittleEndian: boolean) => {
    const endianCharacter = getEndianCharacter(isLittleEndian);
    const bytesPerValue = Bufferpack.calcLength(`=${format}`);
    const length = rawValue.length;

    if (length % bytesPerValue !== 0) {
      console.error('Received wrong length for the given bytesPerValue');
    }

    const formatString = `${endianCharacter}${_.floor(
      length / bytesPerValue
    )}${format}`;
    const values = Bufferpack.unpack(formatString, rawValue);

    if (values.length === 0) {
      return NaN;
    }

    return values.length === 1 ? values[0] : values;
  };

const convertUI = (rawValue: Uint8Array) => {
  const valueString = _.trimEnd(decodeToText(rawValue), '\0 ');
  return getMultiString(valueString);
};

const convertOB = (rawValue: Uint8Array) => {
  return rawValue;
};

const convertText = (rawValue: Uint8Array) => {
  const value = decodeToText(rawValue);
  return getMultiString(value);
};

const convertString = (rawValue: Uint8Array) => {
  const value = decodeToText(rawValue);
  return getMultiString(value);
};

const convertDAString = (rawValue: Uint8Array) => {
  const value = convertText(rawValue);
  return handleMultiString(value, handleDA);
};

const convertTMString = (rawValue: Uint8Array) => {
  const value = convertText(rawValue);
  return handleMultiString(value, handleTM);
};

const convertPN = (rawValue: Uint8Array) => {
  const value = _.trimEnd(decodeToText(rawValue), '\x00 ');
  return getMultiString(value);
};

const convertISString = (rawValue: Uint8Array) => {
  const value = decodeToText(rawValue);
  return Number(value.trim());
};

const convertDSString = (rawValue: Uint8Array) => {
  const value = decodeToText(rawValue);
  return Number(value.trim());
};

const convertAEString = (rawValue: Uint8Array) => {
  const value = decodeToText(rawValue);
  const values = getMultiString(value);
  return map(values, (v) => trim(v));
};

const convertDTString = (rawValue: Uint8Array) => {
  return convertText(rawValue);
};

const convertSingleString = (rawValue: Uint8Array) => {
  const value = decodeToText(rawValue);
  return trimEnd(value, '\0 ');
};

// const convertSQ = (rawValue: Uint8Array) => {
//   if (rawValue.length === 0) {
//     return [];
//   }
//   const byteLength =
//     rawValue.length === parseInt('0xFFFFFFFF', 16) ? 0 : rawValue.length;
// };
// const convertTag = (
//   rawValue: Uint8Array,
//   isLittleEndian: boolean,
//   offset: number = 0
// ) => {
//   const pattern = `${isLittleEndian ? '<' : '>'}HH`;
//
// };

// const convertAT = (rawValue: Uint8Array) => {};

const notImplementedYet = (
  rawValue: Uint8Array,
  isLittleEndian: boolean,
  VR: string
) => {
  console.error('not implemented yet, converted failed on', {
    rawValue,
    isLittleEndian,
    VR,
  });
};

const converters: { [key: string]: CallableFunction } = {
  'OB or OW': convertOB,
  LO: convertText,
  OB: convertOB,
  OD: convertOB,
  OL: convertOB,
  SH: convertText,
  UC: convertText,
  UI: convertUI,
  UL: convertNumbers('L'),
  AE: convertAEString,
  OF: convertOB,
  AS: convertString,
  AT: notImplementedYet,
  CS: convertString,
  DA: convertDAString,
  DS: convertDSString,
  DT: convertDTString,
  FD: convertNumbers('d'),
  FL: convertNumbers('f'),
  IS: convertISString,
  LT: convertSingleString,
  OV: convertOB,
  OW: convertOB,
  PN: convertPN,
  SL: convertNumbers('l'),
  SQ: notImplementedYet,
  SS: convertNumbers('h'),
  ST: convertSingleString,
  SV: convertNumbers('q'),
  TM: convertTMString,
  UN: convertOB,
  UR: convertOB,
  US: convertNumbers('H'),
  UT: convertSingleString,
  UV: convertNumbers('Q'),
  'US or OW': convertOB,
  'US or SS or OW': convertOB,
  'US or SS': convertOB,
};

// {
//   "VR": "SH",
//   "length": 8,
//   "rawValue": {
//   "0": 73,
//     "1": 78,
//     "2": 70,
//     "3": 95,
//     "4": 52,
//     "5": 46,
//     "6": 53,
//     "7": 32
// }
// }
// UL OB UI UI UI UI UI UI SH
const convertValue = (
  VR: string,
  tagInfo: ITagInfo,
  isLittleEndian: boolean
) => {
  const converter = converters[VR];
  if (!converter) {
    console.error(`no converter found for VR: ${VR}, returning rawValue`);
    return tagInfo.rawValue;
  }

  return converter(tagInfo.rawValue, isLittleEndian, VR);
};

export { convertValue, converters };
