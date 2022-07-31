import _, {
  chunk,
  has,
  isUndefined,
  join,
  map,
  max,
  min,
  reverse,
  takeRight,
} from 'lodash';

const getEndianCharacter = (isLittleEndian: boolean) => {
  return isLittleEndian ? '<' : '>';
};

const getEndianPattern = (isLittleEndian: boolean, isImplicitVR: boolean) => {
  return `${getEndianCharacter(isLittleEndian)}${
    isImplicitVR ? 'HHL' : 'HH2sH'
  }`;
};

const decodeToText = (rawValue: Uint8Array) => {
  return new TextDecoder().decode(rawValue);
};

const handleDA = (value: string) => {
  const trimmedValue = value.trim();
  if (_.isEmpty(trimmedValue)) {
    return null;
  }

  if (trimmedValue.length === 8) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    return new Date(year, month, day);
  } else if (
    trimmedValue.length === 10 &&
    value[4] === '.' &&
    value[7] === '.'
  ) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    return new Date(year, month, day);
  }
  return null;
};

const handleTM = (value: string) => {
  const trimmedValue = value.trim();
  if (_.isEmpty(trimmedValue)) {
    return null;
  }
  const [mainPart, miliSecondsPart] = trimmedValue.split('.');
  if (_.isString(mainPart) && mainPart.length === 6) {
    const hours = Number(value.slice(0, 2));
    const minutes = Number(value.slice(2, 4)) || 0;
    const seconds = Number(value.slice(4, 6)) || 0;
    const microseconds = miliSecondsPart ? Number(miliSecondsPart) : 0;
    return {
      string: `${hours}:${minutes}:${seconds}:${microseconds}`,
      hours,
      minutes,
      seconds: seconds === 60 ? 59 : seconds,
      microseconds,
    };
  }
  return null;
};

const Uint8Helpers = {
  arrayToHex: (bytes: Uint8Array): readonly string[] => {
    return _.map(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  },

  splitArray: (
    array: Uint8Array,
    firstArrayElements: number
  ): readonly [Uint8Array, Uint8Array] => {
    return [
      array.slice(0, firstArrayElements),
      array.slice(firstArrayElements),
    ];
  },

  getArrayRange: (
    array: Uint8Array,
    start: number,
    range: number
  ): Uint8Array => {
    return array.slice(start, start + range);
  },

  arrayToText: (array: Uint8Array): string => {
    return _.map(array, (byte) => {
      return String.fromCharCode(byte);
    }).join('');
  },
};

const getHexRepresentation = (group: number, element: number) => {
  const hexGroup = join(takeRight(`0000${group.toString(16)}`, 4), '');
  const hexElement = join(takeRight(`0000${element.toString(16)}`, 4), '');
  return { hexGroup, hexElement };
};

const notGroup0000 = (group: number): boolean => {
  return group !== 0;
};

const notGroup0002 = (group: number): boolean => {
  return group !== 2;
};

const littleEndianToBigEndian = (hex: string) => {
  if (hex.length > 2) {
    return join(reverse(map(chunk(hex, 2), (c) => join(c, ''))), '');
  }
  return hex;
};

const getSafeKey = (object: Record<string, unknown>, key: string) => {
  // eslint-disable-next-line functional/no-let
  let index = 1;
  // eslint-disable-next-line functional/no-loop-statement
  while (has(object, index === 0 ? key : `${key}-${index}`)) {
    index += 1;
  }
  return `${key}-${index}`;
};

const numberToHex = (i: number) => {
  return ('0' + i.toString(16)).slice(-2);
};

const getMultiString = (value: string) => {
  const valueSplit = _.split(value, '\\');
  return valueSplit.length === 1 ? valueSplit[0] : valueSplit;
};

const getInRange = (value: number, minimum: number, maximum?: number) => {
  const minValue = min([value, maximum]);
  const maxValue = max([minValue, minimum]);
  return isUndefined(maxValue) ? value : maxValue;
};

const handleMultiString = (
  value: string | string[],
  callback: CallableFunction
) => {
  if (_.isString(value)) {
    return callback(value);
  }
  return _.map(value, callback);
};

export {
  Uint8Helpers,
  decodeToText,
  getEndianCharacter,
  getEndianPattern,
  getHexRepresentation,
  getInRange,
  getMultiString,
  getSafeKey,
  handleDA,
  handleMultiString,
  handleTM,
  littleEndianToBigEndian,
  notGroup0000,
  notGroup0002,
  numberToHex,
};
