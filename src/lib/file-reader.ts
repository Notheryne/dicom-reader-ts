import { FullDataset } from '../types';

import { parseFile } from './parse';

const readBytes = (data: ArrayBuffer | Uint8Array): FullDataset => {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return parseFile(bytes);
};

const readFile = async (file: File): Promise<FullDataset> => {
  const data = await file.arrayBuffer();
  return readBytes(data);
};

export { readBytes, readFile };
