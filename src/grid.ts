import { Dimensions, GridState } from "./types";

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

  private drawGrid() {
    if (!this.ctx) throw new Error("Cannot draw without a context");
    this.ctx.beginPath();
    this.ctx.strokeStyle = Grid.GRID_COLOR;

    // Vertical lines.
    for (let i = 0; i <= this.width; i++) {
      this.ctx.moveTo(i * (Grid.CELL_SIZE + 1) + 1, 0);
      this.ctx.lineTo(i * (Grid.CELL_SIZE + 1) + 1, (Grid.CELL_SIZE + 1) * this.height + 1);
    }

    // Horizontal lines.
    for (let j = 0; j <= this.height; j++) {
      this.ctx.moveTo(0, j * (Grid.CELL_SIZE + 1) + 1);
      this.ctx.lineTo((Grid.CELL_SIZE + 1) * this.width + 1, j * (Grid.CELL_SIZE + 1) + 1);
    }

    this.ctx.stroke();
  }

  private drawCells(state: GridState) {
    if (!this.ctx) throw new Error("Cannot draw without a context");
    this.ctx.beginPath();

    // Alive cells.
    this.ctx.fillStyle = Grid.ALIVE_COLOR;
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const idx = this.getIndex(row, col);
        if (state[idx] !== 1) {
          continue;
        }

        this.ctx.fillRect(col * Grid.CELL_SIZE + 0, row * Grid.CELL_SIZE + 0, Grid.CELL_SIZE, Grid.CELL_SIZE);
      }
    }

    // Dead cells.
    this.ctx.fillStyle = Grid.DEAD_COLOR;
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const idx = this.getIndex(row, col);
        if (state[idx] !== 0) {
          continue;
        }

        this.ctx.fillRect(col * Grid.CELL_SIZE, row * Grid.CELL_SIZE, Grid.CELL_SIZE, Grid.CELL_SIZE);
      }
    }

    this.ctx.stroke();
  }
  render(state: GridState) {
    // this.drawGrid();
    this.drawCells(state);
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
