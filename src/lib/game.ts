import { wait, randomize } from "./util";
import { SlidingWindow } from "./metrics";
import type { Dimensions, GridState, Frame } from "./types";
import { Grid } from "./grid";

type FrameGenerator = (prevFrame: Frame) => Promise<[GridState, Uint8ClampedArray]>;

export class Game {
  private _generateNewFrame: FrameGenerator;
  private running = false;
  private cancelNextUpdate = false;
  private metricsCallback?: (metrics: any, stuff: any) => void;

  dimensions: Dimensions;
  fpsMetrics: SlidingWindow;

  state: GridState;
  grid: Grid;

  constructor(dimensions: Dimensions) {
    this._generateNewFrame = async (prevFrame) => [
      prevFrame.gridState,
      Grid.getImageDataArrayFromState(prevFrame.gridState),
    ];

    this.fpsMetrics = new SlidingWindow(100);
    this.grid = new Grid(dimensions);
    this.updateDimensions(dimensions);
    // this.render(Grid.getImageDataArrayFromState(this.state));
  }

  getCurrentFrame(): Frame {
    return {
      gridState: this.state,
      dimensions: this.dimensions,
    };
  }

  updateDimensions(dimensions: Dimensions) {
    if (this.running) {
      this.cancelNextUpdate = true;
    }
    this.dimensions = dimensions;
    this.state = new Uint32Array(this.dimensions.width * this.dimensions.height);
    this.grid.updateDimensions(dimensions);
  }

  randomizeState() {
    if (this.running) {
      this.cancelNextUpdate = true;
    }
    this.state = randomize(new Uint32Array(this.state.length));
  }

  onMetricsUpdate(callback: (fps: number, data: number[]) => void) {
    this.metricsCallback = callback;
  }

  setFrameGenerator(callback: FrameGenerator) {
    this._generateNewFrame = callback;
  }

  async loop() {
    if (this.running) return;
    this.running = true;
    let timestamp = performance.now();
    while (this.running) {
      const [state, imageData] = await this._generateNewFrame(this.getCurrentFrame());
      if (this.cancelNextUpdate) {
        this.cancelNextUpdate = false;
      } else {
        this.state = state;
      }

      const now = performance.now();
      this.fpsMetrics.register(1000 / (now - timestamp));
      if (this.metricsCallback) {
        this.metricsCallback(this.fpsMetrics.avg(), this.fpsMetrics.buffer);
      }
      timestamp = now;

      if (!this.running) break;
      this.render(imageData);
    }
  }

  render(imageData?: Uint8ClampedArray) {
    const _imageData = imageData ?? Grid.getImageDataArrayFromState(this.state);
    requestAnimationFrame(() => this.grid.renderImageData(_imageData));
  }

  stop() {
    this.running = false;
  }
}
