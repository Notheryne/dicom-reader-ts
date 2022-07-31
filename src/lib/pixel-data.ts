import {
  ceil,
  chunk,
  join,
  map,
  max,
  min,
  padStart,
  parseInt,
  reduce,
  startsWith,
  toUpper,
} from 'lodash';

import { Dataset, ITag } from '../types';

import { littleEndianToBigEndian, numberToHex } from './helpers';
import { getTagsGroup, getTagValue } from './helpers/tag-helpers';

const pixelDataToSignedInt = (data: string[]) => {
  return map(data, (num: string) => {
    const bits = parseInt(num, 16).toString(2);

    if (startsWith(bits, '1') && bits.length === 16) {
      const numberAfterXor = parseInt(
        join(
          map(bits, (b) => (b === '0' ? '1' : '0')),
          ''
        ),
        2
      );

      const value = -(numberAfterXor + 1);
      return value === 0 ? -32768 : value;
    }
    return parseInt(bits, 2);
  });
};

const adjustToWindow = (
  pixelData: number[],
  windowCenter?: ITag<number>,
  windowWidth?: ITag<number>
) => {
  const safeWindowCenter =
    windowCenter && windowCenter.value ? windowCenter.value : 610;
  const safeWindowWidth =
    windowWidth && windowWidth.value ? windowWidth.value : 1221;

  const minPixelValue = safeWindowCenter - safeWindowWidth / 2;
  const maxPixelValue = safeWindowCenter + safeWindowWidth / 2;
  const scalingFactor =
    255 / (Math.abs(minPixelValue) + Math.abs(maxPixelValue));

  return map(pixelData, (value: number) => {
    const valueInRange = min([max([value, minPixelValue]), maxPixelValue])!;
    const positiveValue =
      minPixelValue < 0 ? valueInRange + Math.abs(minPixelValue) : valueInRange;
    return Math.floor(positiveValue * scalingFactor);
  });
};

const getPixelData = (dataset: Dataset) => {
  const {
    bitsAllocated,
    bitsStored,
    highBit,
    photometricInterpretation,
    pixelRepresentation,
    rescaleIntercept,
    rescaleSlope,
    windowCenter,
    windowWidth,
  } = getTagsGroup(dataset, '0028');
  const pixelData = getTagValue(dataset, 'Pixel Data');

  if (!pixelData) {
    return;
  }
  const hexAllocated = ceil(bitsAllocated.value / 8) * 2;

  const pixelDataHexString = map(
    chunk(
      reduce(
        pixelData.rawValue,
        (acc: string, i: number) => {
          return acc + numberToHex(i);
        },
        ''
      ),
      hexAllocated
    ),
    (i: string[]) => {
      return join(i, '');
    }
  );

  const pixelDataBigEndian =
    highBit.value + 1 === bitsStored.value
      ? map(pixelDataHexString, littleEndianToBigEndian)
      : pixelDataHexString;

  const rescaleSlopeValue = rescaleSlope ? rescaleSlope.value : 1;
  const rescaleInterceptValue = rescaleIntercept ? rescaleIntercept.value : 0;
  const pixelDataSignedScaled = map(
    pixelRepresentation.value === 0
      ? map(pixelDataBigEndian, (hex: string) => parseInt(hex, 16))
      : pixelDataToSignedInt(pixelDataBigEndian),
    (num) => rescaleSlopeValue * num + rescaleInterceptValue
  );

  const pixelDataWindowAdjusted = adjustToWindow(
    pixelDataSignedScaled,
    windowCenter,
    windowWidth
  );

  const pixelDataInterpreted =
    photometricInterpretation &&
    photometricInterpretation.value === 'MONOCHROME1'
      ? map(pixelDataWindowAdjusted, (i) => 255 - i)
      : pixelDataWindowAdjusted;

  const hexStringArrayPixelData = map(pixelDataInterpreted, (x: number) => {
    const value = padStart(toUpper(x.toString(16)), 2, '0');
    return `#${value.repeat(3)}`;
  });
  return hexStringArrayPixelData;
};

export { getPixelData };
