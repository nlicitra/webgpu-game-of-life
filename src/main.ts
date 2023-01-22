import { Game } from "./game";
import SimpleAlgo from "./algos/simple";
import { WebGPUGameOfLife } from "./webgpu";
import { Frame } from "./types";
import { debounce } from "./util";
import { makeChart } from "./chart";
import { SlidingWindow } from "./metrics";

const dimensions = {
  width: 50,
  height: 50,
};
const gpu = new WebGPUGameOfLife(dimensions);
let computeType: "js" | "gpu" = "js";

async function gpuAlgo(frame: Frame) {
  return gpu.process(frame.gridState);
}

addEventListener("DOMContentLoaded", async () => {
  const canvas = document.querySelector("#gol-canvas") as HTMLCanvasElement;

  const game = new Game(dimensions);
  game.grid.attachToCanvas(canvas);
  game.setFrameGenerator(async (prevFrame) => {
    const func = {
      js: SimpleAlgo,
      gpu: gpuAlgo,
    }[computeType];
    return func(prevFrame);
  });
  game.randomizeState();
  game.render();

  const fpsCounter = document.querySelector("#fps") as HTMLDivElement;
  const chart = makeChart("#fps-chart");
  const fpsWindow = new SlidingWindow(500);
  game.onMetricsUpdate((fps) => {
    fpsWindow.register(Math.round(fps));
    fpsCounter.innerText = fps.toPrecision(3);
    chart.data.datasets[0].data = fpsWindow.buffer;
    chart.data.labels = fpsWindow.buffer.map((_) => "");
    chart.update();
  });

  const startButton = document.querySelector("#start") as HTMLButtonElement;
  startButton.addEventListener("click", () => game.loop());
  const stopButton = document.querySelector("#stop") as HTMLButtonElement;
  stopButton.addEventListener("click", () => game.stop());
  const resetButton = document.querySelector("#reset") as HTMLButtonElement;
  resetButton.addEventListener("click", () => {
    game.randomizeState();
    game.render();
  });
  const computeTypeSelect = document.querySelector("#compute-type") as HTMLSelectElement;
  computeTypeSelect.addEventListener("change", () => {
    computeType = computeTypeSelect.value as "js" | "gpu";
    game.fpsMetrics.reset();
  });
  const resizeRange = document.querySelector("#resize") as HTMLInputElement;
  const debouncedRender = debounce(() => game.render(), 100);
  resizeRange.addEventListener("input", async function () {
    const size = parseInt(this.value) * 15 + 50;
    const dimensions = { width: size, height: size };
    game.updateDimensions(dimensions);
    gpu.updateDimensions(dimensions);
    game.fpsMetrics.reset();
    game.randomizeState();

    debouncedRender();
  });
});
