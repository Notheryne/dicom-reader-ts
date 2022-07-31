import { map } from 'lodash';

import { DataAttributes, DefaultCanvasId } from '../../constants';
import { IDisplayImageOptions, IPositionChange } from '../../types';

const setFillStyle = (context: CanvasRenderingContext2D, fillStyle: string) => {
  // eslint-disable-next-line functional/immutable-data
  context.fillStyle = fillStyle;
};

const getOrCreateCanvas = (
  element: HTMLDivElement,
  rows: number,
  columns: number,
  options?: IDisplayImageOptions
) => {
  const { disableScroll = false } = options || {};

  const canvasCandidate = document.getElementById(
    DefaultCanvasId
  ) as HTMLCanvasElement;

  const canvas = canvasCandidate || document.createElement('canvas');

  if (!canvasCandidate) {
    canvas.setAttribute('id', DefaultCanvasId);
  }

  if (!disableScroll) {
    canvas.setAttribute(DataAttributes.ZOOM, '1');
  }

  canvas.setAttribute('width', rows.toString());
  canvas.setAttribute('height', columns.toString());
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;

  setFillStyle(context, 'black');
  context.fillRect(0, 0, rows, columns);
  element.appendChild(canvas);
  return { canvas, context };
};

const getCanvasSize = (canvas: HTMLCanvasElement) => {
  return { rows: canvas.width, columns: canvas.height };
};

const resetCanvas = (
  context: CanvasRenderingContext2D,
  rows: number,
  columns: number
) => {
  context.clearRect(0, 0, rows, columns);
  setFillStyle(context, 'black');
  context.fillRect(0, 0, rows, columns);
};

const displayOnCanvas = (
  pixelData: string[],
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
) => {
  const { rows, columns } = getCanvasSize(canvas);
  // forEach(pixelData, (value, index) => {
  //   const row = ~~(index / rows);
  //   const column = index % columns;
  //   if (pixelData[index - 1] !== value) {
  //     setFillStyle(context, value);
  //   }
  //   context.fillRect(column, row, 1, 1);
  // });

  map(pixelData, (value, index) => {
    const row = ~~(index / rows);
    const column = index % columns;
    if (pixelData[index - 1] !== value) {
      setFillStyle(context, value);
    }
    context.fillRect(column, row, 1, 1);
  });

  // reduce(
  //   pixelData,
  //   (lastValue, value, index) => {
  //     const row = ~~(index / rows);
  //     const column = index % columns;
  //
  //     if (value !== lastValue) {
  //       setFillStyle(context, value);
  //     }
  //     context.fillRect(column, row, 1, 1);
  //     return value;
  //   },
  //   ''
  // );

  // // eslint-disable-next-line functional/no-loop-statement,functional/no-let
  // for (let i = 0; i < rows; i++) {
  //   // eslint-disable-next-line functional/no-loop-statement,functional/no-let
  //   for (let j = 0; j < columns; j += 1) {
  //     const fillStyle = pixelData[rows * i + j];
  //
  //     if (fillStyle !== pixelData[rows * i + j - 1]) {
  //       setFillStyle(context, fillStyle);
  //     }
  //     context.fillRect(j, i, 1, 1);
  //   }
  // }
};

const displayCanvasWithZoom = (
  pixelData: string[],
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  offset: IPositionChange,
  zoom = 1
) => {
  const { x, y } = offset;
  const { rows, columns } = getCanvasSize(canvas);
  resetCanvas(context, rows, columns);

  context.translate(x, y);

  canvas.setAttribute(DataAttributes.ZOOM, zoom.toString());
  context.scale(zoom, zoom);
  context.translate(-x, -y);

  displayOnCanvas(pixelData, canvas, context);
};

const displayCanvasWithPan = (
  pixelData: string[],
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  offset: IPositionChange,
  pan: IPositionChange,
  zoom = 1
) => {
  const { rows, columns } = getCanvasSize(canvas);
  resetCanvas(context, rows, columns);

  context.translate(offset.x, offset.y);
  const newX = offset.x + pan.x * (1 / zoom);
  const newY = offset.y + pan.y * (1 / zoom);
  context.translate(-newX, -newY);
  displayOnCanvas(pixelData, canvas, context);
};

const setCanvasBrightness = (canvas: HTMLCanvasElement, value: number) => {
  // eslint-disable-next-line functional/immutable-data
  canvas.style.filter = `brightness(${value})`;
};

export {
  displayCanvasWithPan,
  displayCanvasWithZoom,
  displayOnCanvas,
  getOrCreateCanvas,
  setCanvasBrightness,
  getCanvasSize,
};
