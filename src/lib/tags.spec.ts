// import test from 'ava';
// import { map } from 'lodash';
//
// import { getTagValue } from './file-reader';
//
// const dataset = {
//   '00080018': {
//     'representations': {
//       'group': 8,
//       'element': 24,
//       'hexGroup': '0008',
//       'hexElement': '0018',
//       'tuple': [
//         '0008',
//         '0018'
//       ],
//       'string': '00080018',
//       'name': 'SOP Instance UID'
//     },
//     'length': 46,
//     'representation': '00080018',
//     'VR': 'UI',
//     'name': 'SOP Instance UID',
//     'VM': '1',
//     'keyword': 'SOPInstanceUID',
//     'retired': ''
//   },
//   '7fe0010': {
//     'representations': {
//       'group': 32736,
//       'element': 16,
//       'hexGroup': '0010',
//       'hexElement': '7fe0',
//       'tuple': [
//         '0010',
//         '7fe0'
//       ],
//       'string': '7fe0010',
//       'name': 'Pixel Data'
//     },
//     'length': 524288,
//     'representation': '7fe0010',
//     'VR': 'OB or OW',
//     'name': 'Pixel Data',
//     'VM': '1',
//     'keyword': 'PixelData',
//     'retired': ''
//   },
//   '00080021': {
//     'representations': {
//       'group': 8,
//       'element': 33,
//       'hexGroup': '0008',
//       'hexElement': '0021',
//       'tuple': [
//         '0008',
//         '0021'
//       ],
//       'string': '00080021',
//       'name': 'Series Date'
//     },
//     'length': 8,
//     'representation': '00080021',
//     'VR': 'DA',
//     'name': 'Series Date',
//     'VM': '1',
//     'keyword': 'SeriesDate',
//     'retired': ''
//   }
// };
//
// test('getTagValue for Series Date', (t) => {
//   map(dataset, (tag, key) => {
//     const searchElements = [key,
//       [tag.representations.group, tag.representations.element],
//       [tag.representations.hexGroup, tag.representations.hexElement],
//       tag.name,
//       tag.keyword
//     ]
//
//     map(searchElements, (searchElement) => {
//       t.is(getTagValue(dataset, searchElement), tag);
//     })
//   })
// })
//
