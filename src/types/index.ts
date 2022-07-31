type StopWhenFunction = (
  group: number,
  VR?: string,
  length?: number
) => boolean;

type IKnownTagValues<T> = {
  readonly VR: string;
  readonly length: number;
  readonly rawValue: Uint8Array;
  readonly value: T;
};

type ITagValues<T> = IKnownTagValues<T> & {
  readonly [key: string]: unknown;
};

type ITag<T> = ITagValues<T> & {
  name: string;
  readonly representation: string;
  readonly representations: {
    group: number;
    element: number;
    hexGroup: string;
    hexElement: string;
    tuple: readonly string[];
    string: string;
    name: string;
  };
  keyword: string;
};

type Dataset = Record<string, ITag<any>>;

type FullDataset = {
  isLittleEndian: boolean;
  isImplicitVR: boolean;
} & Dataset;

type ITagInfo = {
  VR: string;
  length: number;
  rawValue: Uint8Array;
};

type IDisplayImageOptions = {
  disableScroll?: boolean;
  scrollSensitivity?: number;
  disablePan?: boolean;
  disableBrightness?: boolean;
  brightnessSensitivity?: number;
  minBrightness?: number;
  maxBrightness?: number;
};

type IPositionChange = {
  x: number;
  y: number;
};

export type {
  Dataset,
  FullDataset,
  IDisplayImageOptions,
  IKnownTagValues,
  IPositionChange,
  ITag,
  ITagInfo,
  ITagValues,
  StopWhenFunction,
};
