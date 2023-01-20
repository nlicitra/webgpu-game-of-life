import { Game } from "./game";
import { Grid } from "./grid";
import { wait } from "./util";
import SimpleAlgo from "./algos/simple";

const dimensions = {
  width: 200,
  height: 200,
};
const grid = new Grid(dimensions);

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

  const game = new Game(dimensions);
  game.setStateGenerator(async (prevState) => {
    await wait(10);
    return SimpleAlgo(prevState);
  });
  game.setRender((state) => {
    grid.render(state.gridState);
  });
  game.randomizeState();
  game.render();

  const fpsCounter = document.querySelector("#fps") as HTMLDivElement;
  game.onMetricsUpdate((fps) => {
    fpsCounter.innerText = fps.toPrecision(3);
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
});
