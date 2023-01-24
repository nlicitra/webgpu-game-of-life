import type { Dimensions, GridState } from "./types";

interface IGridOptions {
  width: number;
  height: number;
  ctx?: CanvasRenderingContext2D;
}

export class Grid {
  static CELL_SIZE = 1;
  static GRID_COLOR = "#CCCCCC";
  static DEAD_COLOR = "#FFFFFF";
  static ALIVE_COLOR = "cornflowerblue";

  width: number;
  height: number;
  cellCount: number;
  canvasDimensions: {
    width: number;
    height: number;
  };
  ctx: CanvasRenderingContext2D | null;
  canvas: HTMLCanvasElement;

  constructor(options: IGridOptions) {
    this.ctx = options.ctx || null;
    this.updateDimensions(options);
  }

  updateDimensions({ width, height }: Dimensions) {
    this.width = width;
    this.height = height;
    this.cellCount = width * height;
    this.canvasDimensions = {
      // width: options.width,
      // height: options.height,
      width: Grid.CELL_SIZE * this.width,
      height: Grid.CELL_SIZE * this.height,
    };
    this.resizeCanvas();
  }

  attachToCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      new Error("Error getting canvas context.");
      return;
    }
    this.ctx = context;
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = this.canvasDimensions.width;
    this.canvas.height = this.canvasDimensions.height;
  }

  private getIndex(row: number, column: number) {
    return row * this.width + column;
  }

  renderImageData(imageData: Uint8ClampedArray) {
    const data = new ImageData(imageData, this.width);
    this.ctx?.putImageData(data, 0, 0);
  }

  // Slow Non GPU way
  static getImageDataArrayFromState(state: Uint32Array) {
    const clamped = new Uint8ClampedArray(state.length * 4);
    for (let i = 0; i < state.length; i++) {
      const color = state[i] === 1 ? [125, 255, 125, 255] : [50, 50, 50, 255];
      clamped.set(color, i * 4);
    }
    return clamped;
  }
}
