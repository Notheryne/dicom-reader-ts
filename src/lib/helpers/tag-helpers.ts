import {
  filter,
  find,
  get,
  isArray,
  isEqual,
  isNumber,
  isObject,
  isString,
  map,
  reduce,
  toLower,
} from 'lodash';

import {
  DicomDictionary,
  DicomDictionaryEntriesEnum,
  GroupLengthEntry,
} from '../../constants';
import { Dataset, ITag, ITagInfo, ITagValues } from '../../types';

import { getHexRepresentation } from './index';

const getTagName = (
  dicomDictionaryEntry?: readonly string[],
  isPrivateTag = false
) => {
  if (isPrivateTag) {
    return 'PrivateTag';
  }

  if (!dicomDictionaryEntry) {
    return 'Unknown';
  }

  return dicomDictionaryEntry[DicomDictionaryEntriesEnum.Name];
};

const createTag = (
  group: number,
  element: number,
  values: ITagValues<any>
): ITag<any> => {
  const isPrivateTag = group % 2 !== 0;

  const { hexGroup, hexElement } = getHexRepresentation(group, element);
  const stringRepresentation = `${hexGroup}${hexElement}`;

  const dicomDictionaryEntry =
    hexElement === '0000'
      ? GroupLengthEntry
      : DicomDictionary[stringRepresentation];

  const representations = {
    group,
    element,
    hexGroup,
    hexElement,
    tuple: [hexGroup, hexElement],
    string: stringRepresentation,
    name: getTagName(dicomDictionaryEntry, isPrivateTag),
  };

  if (isPrivateTag) {
    return {
      ...values,
      representations,
      representation: stringRepresentation,
      VR: 'Unknown-PrivateTag',
      name: 'Unknown-PrivateTag',
      VM: 'Unknown-PrivateTag',
      keyword: 'Unknown-PrivateTag',
      retired: 'Unknown-PrivateTag',
    };
  }

  return {
    ...values,
    representations,
    representation: stringRepresentation,
    VR: values.VR || dicomDictionaryEntry[DicomDictionaryEntriesEnum.VR],
    name: getTagName(dicomDictionaryEntry),
    VM: get(dicomDictionaryEntry, DicomDictionaryEntriesEnum.VM, 'Unknown'),
    keyword: get(
      dicomDictionaryEntry,
      DicomDictionaryEntriesEnum.Keyword,
      'Unknown'
    ),
    retired: get(
      dicomDictionaryEntry,
      DicomDictionaryEntriesEnum.Retired,
      'Unknown'
    ),
  } as ITag<typeof values.value>;
};

const getTagInfo = (
  rawValue: Uint8Array,
  length: number,
  group?: number,
  element?: number,
  VR?: string
): ITagInfo => {
  if (!group && !element && !VR) {
    // eslint-disable-next-line functional/no-throw-statement
    throw Error();
  }

  if (VR) {
    return {
      rawValue,
      length,
      VR,
    };
  }
  const { hexGroup, hexElement } = getHexRepresentation(group!, element!);
  const dicomDictionaryEntry = DicomDictionary[`${hexGroup}${hexElement}`];

  const guessVR =
    hexElement === '0000'
      ? GroupLengthEntry[DicomDictionaryEntriesEnum.VR]
      : dicomDictionaryEntry
      ? dicomDictionaryEntry[DicomDictionaryEntriesEnum.VR]
      : '';

  return {
    rawValue,
    length,
    VR: guessVR,
  };
};

const getMatchedTag = (
  representation: string | (number | string)[],
  tag: ITag<any>
) => {
  if (isArray(representation)) {
    if (isNumber(representation[0])) {
      const { group, element } = tag.representations;
      return isEqual([group, element], representation);
    } else if (isString(representation[0])) {
      return isEqual(
        map(tag.representations.tuple, toLower),
        map(representation, toLower)
      );
    }
  } else {
    if (
      toLower(tag.name) === toLower(representation) ||
      toLower(tag.keyword) === toLower(representation)
    ) {
      return true;
    }
    const transformedRepresentation = toLower(representation).replace(
      /(\(|,|\s)/g,
      ''
    );
    return isEqual(toLower(tag.representation), transformedRepresentation);
  }
  return false;
};

const getTagValue = (
  dataset: Dataset,
  representation: string | (number | string)[]
) => {
  if (isArray(representation) && representation.length !== 2) {
    console.error(
      'Wrong tag identifier supplied. If passed as a tuple it must have 2 elements',
      { tag: representation }
    );
    return null;
  }

  return find(dataset, (tag) => {
    return getMatchedTag(representation, tag);
  });
};

const getTagsGroup = (dataset: Dataset, group: string) => {
  return reduce(
    filter(dataset, (tag) => {
      return isObject(tag) && tag.representations.hexGroup === group;
    }),
    (acc, tag) => {
      const tagName = `${tag.keyword[0].toLowerCase()}${tag.keyword.slice(1)}`;
      return { ...acc, [tagName]: tag };
    },
    {} as Dataset
  );
};

export { createTag, getTagInfo, getTagsGroup, getTagValue };
