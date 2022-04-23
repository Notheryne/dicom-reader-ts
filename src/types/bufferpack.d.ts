declare module 'bufferpack' {
  type BufferpackType = {
    readonly unpack: (pattern: string, buffor: readonly number[] | Uint8Array, position: number) => readonly any[];
  }
  const Bufferpack: BufferpackType;
  export = Bufferpack;
}

