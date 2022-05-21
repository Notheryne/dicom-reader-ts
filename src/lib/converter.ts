import Bufferpack from 'bufferpack';
import _ from 'lodash';

import { ITagInfo } from '../types';

import { decodeToText, getEndianCharacter } from './helpers';

const _getMultiString = (value: string) => {
  const valueSplit = _.split(value, '\\');
  return valueSplit.length === 1 ? valueSplit[0] : valueSplit;
};

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
  return _getMultiString(valueString);
};

const convertOB = (rawValue: Uint8Array) => {
  return rawValue;
};

const convertText = (rawValue: Uint8Array) => {
  const value = decodeToText(rawValue);
  return _getMultiString(value);
};

const notImplementedYet = (rawValue: Uint8Array) => {
  console.error('not implemented yet, converted failed on', {rawValue})
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
  AS: notImplementedYet,
  AT: notImplementedYet,
  CS: notImplementedYet,
  DA: notImplementedYet,
  DS: notImplementedYet,
  DT: notImplementedYet,
  FD: notImplementedYet,
  FL: notImplementedYet,
  IS: notImplementedYet,
  LT: notImplementedYet,
  OV: notImplementedYet,
  OW: notImplementedYet,
  PN: notImplementedYet,
  SL: notImplementedYet,
  SQ: notImplementedYet,
  SS: notImplementedYet,
  ST: notImplementedYet,
  SV: notImplementedYet,
  TM: notImplementedYet,
  UN: notImplementedYet,
  UR: notImplementedYet,
  US: notImplementedYet,
  UT: notImplementedYet,
  UV: notImplementedYet,
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

  return converter(tagInfo.rawValue, isLittleEndian);
};

export { convertValue, converters };
