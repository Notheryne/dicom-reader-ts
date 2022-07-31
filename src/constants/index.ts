import { KnownUIDs } from './UIDs';
import DicomDictionary from './dicom-dictionary';

const Constants = {
  DICOM_MAGIC_PREFIX: 'DICM',
  ERRORS: {
    MISSING_DICOM_FILE_META_INFORMATION_HEADER:
      'The file does not contain DICOM File Meta Information Header or the "DICM" prefix is missing.',
  },
  SPECIFIC_CHARACTER_SET_TAG: '00080005',
};

enum DicomDictionaryEntriesEnum {
  'VR',
  'VM',
  'Name',
  'Retired',
  'Keyword',
}

const ExtraLengthVRs = [
  'OB',
  'OD',
  'OF',
  'OL',
  'OW',
  'SQ',
  'UC',
  'UN',
  'UR',
  'UT',
];

const GroupLengthEntry = ['UL', '1', 'GroupLength', '', 'GroupLength'];

const DefaultCanvasId = 'image-annotator-canvas';

const DefaultScrollSensitivity = 0.001;

const DefaultBrightnessSensitivity = 10;

const DefaultMinBrightness = 0.3;
const DefaultMaxBrightness = 10;

const DataAttributes = {
  ZOOM: 'data-zoom',
  DRAG_LEFT_X: 'data-drag-left-x',
  DRAG_LEFT_Y: 'data-drag-left-y',
  DRAG_RIGHT_Y: 'data-drag-right-y',
};

export {
  Constants,
  DataAttributes,
  DefaultBrightnessSensitivity,
  DefaultCanvasId,
  DefaultMaxBrightness,
  DefaultMinBrightness,
  DefaultScrollSensitivity,
  DicomDictionary,
  DicomDictionaryEntriesEnum,
  ExtraLengthVRs,
  GroupLengthEntry,
  KnownUIDs,
};
