const getEndianCharacter = (isLittleEndian: boolean) => {
  return isLittleEndian ? '<' : '>';
};

const getEndianPattern = (isLittleEndian: boolean, isImplicitVR: boolean) => {
  return `${getEndianCharacter(isLittleEndian)}${isImplicitVR ? 'HHL' : 'HH2sH'}`;
};

const decodeToText = (rawValue: Uint8Array) => {
  return new TextDecoder().decode(rawValue);
}

export {getEndianCharacter, getEndianPattern, decodeToText}
