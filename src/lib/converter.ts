import Bufferpack from 'bufferpack';
import _ from 'lodash';

import { ITagInfo } from '../types';

import {
  decodeToText,
  getEndianCharacter,
  handleDA,
  handleTM
} from './helpers';
import { getMultiString, handleMultiString } from './multi-string';



const convertNumbers = (format: string) => (rawValue: Uint8Array, isLittleEndian: boolean) => {
  const endianCharacter = getEndianCharacter(isLittleEndian);
  const bytesPerValue = Bufferpack.calcLength(`=${format}`);
  const length = rawValue.length;

  if (length % bytesPerValue !== 0) {
    console.error('Received wrong length for the given bytesPerValue');
  }

  const formatString = `${endianCharacter}${_.floor(length / bytesPerValue)}${format}`;
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
}

const convertDAString = (rawValue: Uint8Array) => {
  const value = convertText(rawValue);
  return handleMultiString(value, handleDA)
}

const convertTMString = (rawValue: Uint8Array) => {
  const value = convertText(rawValue);
  return handleMultiString(value, handleTM)
}

const convertPN = (rawValue: Uint8Array) => {
  const value = _.trimEnd(decodeToText(rawValue), '\x00 ');
  return getMultiString(value);
}

const convertISString = (rawValue: Uint8Array) => {
  const value = decodeToText(rawValue);
  return Number(value.trim())
}

const convertDSString = (rawValue: Uint8Array) => {
  const value = decodeToText(rawValue);
  return Number(value.trim());
}

const notImplementedYet = (rawValue: Uint8Array, isLittleEndian: boolean, VR: string) => {
  console.error('not implemented yet, converted failed on', {rawValue, isLittleEndian, VR})
}

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
  AE: notImplementedYet,
  OF: notImplementedYet,
  AS: convertString,
  AT: notImplementedYet,
  CS: convertString,
  DA: convertDAString,
  DS: convertDSString,
  DT: notImplementedYet,
  FD: convertNumbers('d'),
  FL: convertNumbers('f'),
  IS: convertISString,
  LT: notImplementedYet,
  OV: notImplementedYet,
  OW: notImplementedYet,
  PN: convertPN,
  SL: convertNumbers('l'),
  SQ: notImplementedYet,
  SS: convertNumbers('h'),
  ST: notImplementedYet,
  SV: convertNumbers('q'),
  TM: convertTMString,
  UN: notImplementedYet,
  UR: notImplementedYet,
  US: convertNumbers('H'),
  UT: notImplementedYet,
  UV: convertNumbers('Q'),
  'US or OW': notImplementedYet,
  'US or SS or OW': notImplementedYet,
  'US or SS': notImplementedYet,
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
const convertValue = (VR: string, tagInfo: ITagInfo, isLittleEndian: boolean) => {
  const converter = converters[VR];
  if (!converter) {
    console.error(`no converter found for VR: ${VR}`);
    return;
  }

  return converter(tagInfo.rawValue, isLittleEndian, VR);
};

export { convertValue, converters };
