import { wait, randomize } from "./util";
import { SlidingWindow } from "./metrics";
import { Dimensions, Frame } from "./types";

type GridState = Uint8Array;
type StateGenerator = (prevState: Frame) => Promise<GridState>;
type RenderFn = (frame: Frame) => void;

export class Game {
  private _generateNewState: StateGenerator;
  private _render: RenderFn;
  private running = false;
  private cancelNextUpdate = false;
  private metricsCallback?: (metrics: any) => void;

  dimensions: Dimensions;
  fpsMetrics: SlidingWindow;

  state: GridState;

  constructor(dimensions: Dimensions) {
    this._generateNewState = async (state) => state.gridState;
    this._render = () => {};

    this.dimensions = dimensions;
    this.fpsMetrics = new SlidingWindow(1000);
    this.state = new Uint8Array(this.dimensions.width * this.dimensions.height);
    this.render();
  }

  getCurrentFrame(): Frame {
    return {
      gridState: this.state,
      dimensions: this.dimensions,
    };
  }

  randomizeState() {
    if (this.running) {
      this.cancelNextUpdate = true;
    }
    this.state = randomize(new Uint8Array(this.state.length));
  }

  onMetricsUpdate(callback: (fps: number) => void) {
    this.metricsCallback = callback;
  }

  setStateGenerator(callback: StateGenerator) {
    this._generateNewState = callback;
  }
  setRender(callback: RenderFn) {
    this._render = callback;
  }

  async loop() {
    if (this.running) return;
    this.running = true;
    let timestamp = performance.now();
    while (this.running) {
      const state = await this._generateNewState(this.getCurrentFrame());
      if (this.cancelNextUpdate) {
        this.cancelNextUpdate = false;
      } else {
        this.state = state;
      }

      const now = performance.now();
      this.fpsMetrics.register(1000 / (now - timestamp));
      if (this.metricsCallback) {
        this.metricsCallback(this.fpsMetrics.avg());
      }
      timestamp = now;

      if (!this.running) break;
      this.render();
    }
  }

  render() {
    requestAnimationFrame(this._render.bind(this, this.getCurrentFrame()));
  }

  stop() {
    this.running = false;
  }
}
