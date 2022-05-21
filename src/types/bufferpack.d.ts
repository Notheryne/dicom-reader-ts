declare module 'bufferpack' {
  type BufferpackType = {
    readonly unpack: (pattern: string, buffor: readonly number[] | Uint8Array, position?: number) => readonly any[];
    readonly calcLength: (format: string, values?: readonly number[] | Uint8Array) => number;
  }
  const Bufferpack: BufferpackType;
  export = Bufferpack;
}

