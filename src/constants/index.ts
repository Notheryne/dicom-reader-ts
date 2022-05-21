import { KnownUIDs } from './UIDs';
import DicomDictionary from './dicom-dictionary';

const Constants = {
  DICOM_MAGIC_PREFIX: 'DICM',
  ERRORS: {
    MISSING_DICOM_FILE_META_INFORMATION_HEADER: 'The file does not contain DICOM File Meta Information Header or the "DICM" prefix is missing.'
  },
  SPECIFIC_CHARACTER_SET_TAG: '00080005'
};

enum DicomDictionaryEntriesEnum {
  'VR',
  'VM',
  'Name',
  'Retired',
  'Keyword'
}

const ExtraLengthVRs = ['OB', 'OD', 'OF', 'OL', 'OW', 'SQ', 'UC', 'UN', 'UR', 'UT'];


export {
  Constants,
  DicomDictionary,
  DicomDictionaryEntriesEnum,
  ExtraLengthVRs,
  KnownUIDs
};
