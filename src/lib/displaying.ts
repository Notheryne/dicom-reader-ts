import {
  DataAttributes,
  DefaultBrightnessSensitivity,
  DefaultMaxBrightness,
  DefaultMinBrightness,
  DefaultScrollSensitivity,
} from '../constants';
import { FullDataset, IDisplayImageOptions } from '../types';

import { getInRange } from './helpers';
import {
  displayCanvasWithPan,
  displayCanvasWithZoom,
  displayOnCanvas,
  getCanvasSize,
  getOrCreateCanvas,
  setCanvasBrightness,
} from './helpers/canvas-helpers';
import { getTagValue } from './helpers/tag-helpers';
import { getPixelData } from './pixel-data';

const getData = (dataset: FullDataset) => {
  const pixelData = getPixelData(dataset);

  const rows = getTagValue(dataset, 'Rows')!.value;
  const columns = getTagValue(dataset, 'Columns')!.value;

  return { pixelData, rows, columns };
};

const handleWheel = (
  event: WheelEvent,
  pixelData: string[],
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  scrollSensitivity: number
) => {
  const currentZoom = parseFloat(
    canvas.getAttribute(DataAttributes.ZOOM) || '1'
  );
  const change = event.deltaY * scrollSensitivity;
  const isRevertingZoom = currentZoom > 1 && change > 0;

  const newZoom = (isRevertingZoom ? 1 : currentZoom) - change;
  const { offsetX, offsetY } = event;

  displayCanvasWithZoom(
    pixelData,
    canvas,
    context,
    { x: offsetX, y: offsetY },
    newZoom
  );
};

const handleLeftClickMouseDown = (
  event: MouseEvent,
  canvas: HTMLCanvasElement
) => {
  canvas.setAttribute(DataAttributes.DRAG_LEFT_X, event.offsetX.toString());
  canvas.setAttribute(DataAttributes.DRAG_LEFT_Y, event.offsetY.toString());
};

const handlePanMouseUp = (
  event: MouseEvent,
  pixelData: string[],
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
) => {
  const startX = parseInt(
    canvas.getAttribute(DataAttributes.DRAG_LEFT_X) || '0'
  );

  const startY = parseInt(
    canvas.getAttribute(DataAttributes.DRAG_LEFT_Y) || '0'
  );

  if (!startX && !startY) {
    return;
  }

  const zoom = parseFloat(canvas.getAttribute(DataAttributes.ZOOM) || '1');
  const currentX = event.offsetX;
  const currentY = event.offsetY;
  const changeX = startX - currentX;
  const changeY = startY - currentY;
  displayCanvasWithPan(
    pixelData,
    canvas,
    context,
    {
      x: startX,
      y: startY,
    },
    {
      x: changeX,
      y: changeY,
    },
    zoom
  );

  canvas.removeAttribute(DataAttributes.DRAG_LEFT_X);
  canvas.removeAttribute(DataAttributes.DRAG_LEFT_Y);
};

const handleRightClickMouseDown = (
  event: MouseEvent,
  canvas: HTMLCanvasElement
) => {
  canvas.setAttribute(DataAttributes.DRAG_RIGHT_Y, event.offsetY.toString());
};

const handleBrightnessChangeMouseUp = (
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  brightnessSensitivity: number,
  minBrightness: number,
  maxBrightness?: number
) => {
  const startY = parseInt(
    canvas.getAttribute(DataAttributes.DRAG_RIGHT_Y) || '0'
  );

  if (!startY) {
    return;
  }

  const currentY = event.offsetY;
  const changeY = startY - currentY;
  const { columns } = getCanvasSize(canvas);
  const brightnessChange = (changeY / columns) * brightnessSensitivity;

  const currentBrightnessFilter = canvas.style.filter.match(/\((.*)\)/);
  const currentBrightness = parseInt(
    currentBrightnessFilter
      ? currentBrightnessFilter[currentBrightnessFilter.length - 1]
      : '1'
  );

  const newBrightness = getInRange(
    currentBrightness + brightnessChange,
    minBrightness,
    maxBrightness
  );

  setCanvasBrightness(canvas, newBrightness);
  canvas.removeAttribute(DataAttributes.DRAG_RIGHT_Y);
};

const handleOptions = (
  pixelData: string[],
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  options?: IDisplayImageOptions
) => {
  const {
    disableScroll = false,
    scrollSensitivity = DefaultScrollSensitivity,
    disablePan = false,
    disableBrightness = false,
    brightnessSensitivity = DefaultBrightnessSensitivity,
    minBrightness = DefaultMinBrightness,
    maxBrightness = DefaultMaxBrightness,
  } = options || {};

  if (!disableScroll) {
    canvas.addEventListener('wheel', (event) => {
      handleWheel(event, pixelData, canvas, context, scrollSensitivity);
    });
  }

  if (!disablePan) {
    canvas.addEventListener('mousedown', (event) => {
      if (event.buttons === 1) {
        handleLeftClickMouseDown(event, canvas);
      }
    });

    canvas.addEventListener('mouseup', (event) => {
      handlePanMouseUp(event, pixelData, canvas, context);
    });
  }

  if (!disableBrightness) {
    setCanvasBrightness(canvas, 1);
    canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    canvas.addEventListener('mousedown', (event) => {
      if (event.buttons === 2) {
        handleRightClickMouseDown(event, canvas);
      }
    });

    canvas.addEventListener('mouseup', (event) => {
      handleBrightnessChangeMouseUp(
        event,
        canvas,
        brightnessSensitivity,
        minBrightness,
        maxBrightness
      );
    });
  }
};

const displayImage = (
  elementId: string,
  dataset: FullDataset,
  options?: IDisplayImageOptions
) => {
  const element = document.getElementById(elementId) as HTMLDivElement;
  if (!element) {
    console.error(
      "Can't display image, element doesn't exist. Did you provide a proper id?"
    );
    return;
  }

  const { pixelData, rows, columns } = getData(dataset);

  if (!pixelData) {
    console.error("Couldn't get pixel data.");
    return;
  }

  const { canvas, context } = getOrCreateCanvas(
    element,
    rows,
    columns,
    options
  );

  displayOnCanvas(pixelData, canvas, context);

  handleOptions(pixelData, canvas, context, options);
  return { pixelData, canvas, context };
};

export { displayImage };
