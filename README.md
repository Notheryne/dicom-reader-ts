# Dicom Reader TS

It's a simple library to handle DICOM files in browser. It is still in **proof of concept** state, so go easy on it. For more information, look at the wiki on this repository.

## Quick Start

To start, just import required functions from the library and use them.

```javascript
import { getPixelData, readFile, displayImage, FullDataset } from 'dicom-reader-ts';

const onFileUpload = (event: Event<HTMLInputElement>) => {
  // do whatever you need with your file
  const file = event.target.files[0];
  
  readFile(file).then((dataset: FullDataset) => {
    // the first argument is the id of your container
    // to display the canvas in
    displayImage('dicom-container', dataset);
    // or if you do not want to display it, just call
    const pixelData = getPixelData(dataset);
  })
}
```


## Based on

  - [Typescript Starter](https://github.com/bitjson/typescript-starter)
  - [Pydicom](https://pydicom.github.io/)
  - Invaluable input from [a-huli](https://github.com/bitjson/typescript-starter)
