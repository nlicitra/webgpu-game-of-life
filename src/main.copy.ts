import { Grid } from "./grid";
import { setup } from "./webgpu";
import { randomize } from "./util";

const grid = new Grid({
  width: 2300,
  height: 1000,
});
let updateState: (state: Uint32Array) => Promise<[Uint32Array, Uint8ClampedArray]>;
let state = randomize(new Uint32Array(grid.width * grid.height));
let imageData = grid.getImageDataArrayFromState(state);

addEventListener("DOMContentLoaded", async () => {
  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  if (!context) {
    console.error("Error getting canvas context.");
    return;
  }
  grid.setContext(context);
  canvas.width = grid.canvasDimensions.width;
  canvas.height = grid.canvasDimensions.height;
  grid.render(imageData);

  updateState = await setup(grid.width, grid.height);

  let frame: number | null = null;
  const fpsContainer = document.querySelector("#fps") as HTMLDivElement;

  let lastFrameTimestamp = performance.now();
  let fpsHistory: number[] = [];
  async function loop() {
    let now = performance.now();
    let delta = now - lastFrameTimestamp;
    lastFrameTimestamp = now;
    if (fpsHistory.length >= 100) {
      fpsHistory.shift();
    }
    fpsHistory.push((1 / delta) * 1000);
    let fps = 0;
    for (let i = 0; i < fpsHistory.length; i++) {
      fps += fpsHistory[i];
    }
    fpsContainer.innerText = String(Math.round(fps / fpsHistory.length));

    grid.render(imageData);
    [state, imageData] = await updateState(state);
    // console.log(imageData);
    // imageData = grid.getImageDataArrayFromState(state);
    if (stopping) return;
    frame = requestAnimationFrame(loop);
  }

  let stopping = false;
  function start() {
    stopping = false;
    loop();
  }
  function stop() {
    stopping = true;
    if (frame) cancelAnimationFrame(frame);
    frame = null;
  }
  function reset() {
    state = randomize(state);
    imageData = grid.getImageDataArrayFromState(state);
    grid.render(imageData);
  }

  const startButton = document.querySelector("#start") as HTMLButtonElement;
  startButton.addEventListener("click", start);
  const stopButton = document.querySelector("#stop") as HTMLButtonElement;
  stopButton.addEventListener("click", stop);
  const resetButton = document.querySelector("#reset") as HTMLButtonElement;
  resetButton.addEventListener("click", reset);
});
