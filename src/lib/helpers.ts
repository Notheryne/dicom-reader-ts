import _ from 'lodash';

const getEndianCharacter = (isLittleEndian: boolean) => {
  return isLittleEndian ? '<' : '>';
};

const getEndianPattern = (isLittleEndian: boolean, isImplicitVR: boolean) => {
  return `${getEndianCharacter(isLittleEndian)}${isImplicitVR ? 'HHL' : 'HH2sH'}`;
};

const decodeToText = (rawValue: Uint8Array) => {
  return new TextDecoder().decode(rawValue);
}


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
  } else if (trimmedValue.length === 10 && value[4] === '.' && value[7] === '.') {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    return new Date(year, month, day);
  }
  return null;
}

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
      microseconds
    }
  }
  return null;
}

export {getEndianCharacter, getEndianPattern, decodeToText, handleDA, handleTM}
