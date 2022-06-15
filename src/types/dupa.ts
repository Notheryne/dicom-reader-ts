declare module 'gdcmconv' {
  type MEMFSElement = {
    name: string,
    data: Uint8Array,
  }
  type GDCMArguments = {
    MEMFS: MEMFSElement[],
    // eslint-disable-next-line functional/functional-parameters
    arguments: string[],
  }

  type GDCM = {
    readonly gdcm: (gdcmArguments: GDCMArguments) => any;
  }
  const gdcm: GDCM;
  export = gdcm;
}

