<script lang="ts">
  import { onMount } from "svelte";
  import { Game } from "$lib/game";
  import Chart from "$lib/Chart.svelte";
  import SimpleAlgo from "$lib/algos/simple";
  import { WebGPUGameOfLife } from "$lib/webgpu";
  import type { Frame } from "$lib/types";
  import { debounce, wait } from "$lib/util";
  import { makeChart } from "$lib/chart";
  import { SlidingWindow } from "$lib/metrics";

  let running = false;
  let golCanvas: HTMLCanvasElement;
  const dimensions = {
    width: 50,
    height: 50,
  };
  let currentFPS: number = 0;
  const game = new Game(dimensions);

  let pixelCount = dimensions.width * dimensions.height;
  function toggleRun() {
    running = !running;
    if (running) {
      game.loop();
    } else {
      game.stop();
    }
  }

  const gpu = new WebGPUGameOfLife();
  let computeType: "js" | "gpu" = "js";

  async function GPUAlgo(frame: Frame) {
    return gpu.process(frame.gridState);
  }
  const fpsWindow = new SlidingWindow(500);
  let fpsChartData: number[] = [];
  let errorWithGPU = false;

  onMount(async () => {
    if (gpu.isSupported()) {
      try {
        await gpu.init(dimensions);
      } catch {
        errorWithGPU = true;
      }
    }
    game.grid.attachToCanvas(golCanvas);
    game.setFrameGenerator(async (prevFrame) => {
      const func = {
        js: SimpleAlgo,
        gpu: GPUAlgo,
      }[computeType];
      return func(prevFrame);
    });
    game.randomizeState();
    game.render();

    game.onMetricsUpdate((fps) => {
      currentFPS = fps;
      fpsWindow.register(Math.round(fps));
      fpsChartData = fpsWindow.buffer;
    });
  });

  function reset() {
    game.randomizeState();
    game.render();
  }

  function onResizeInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const size = parseInt(target.value) * 15 + 50;
    pixelCount = size * size;
  }

  async function resize(event: Event) {
    const target = event.target as HTMLInputElement;
    const size = parseInt(target.value) * 15 + 50;
    const dimensions = { width: size, height: size };
    game.updateDimensions(dimensions);
    if (gpu.isSupported()) {
      gpu.onNextFrameGenerated(() => {
        gpu.updateDimensions(dimensions);
      });
    }
    game.fpsMetrics.reset();
    game.randomizeState();

    await wait(100);
    game.render();
  }

  function onComputeTypeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    computeType = target.value as "js" | "gpu";
    game.fpsMetrics.reset();
  }
</script>

<svelte:head>
  <title>Home</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

<div id="top-row">
  <div id="controls">
    {#if !running}
      <button id="start" on:click={toggleRun}>START</button>
    {:else}
      <button id="stop" on:click={toggleRun}>PAUSE</button>
    {/if}
    <button id="reset" on:click={reset}>RESET</button>
  </div>
  <fieldset id="compute-type">
    <legend>Select a computation method:</legend>
    <div>
      <input type="radio" id="js-compute-type" name="compute-type" value="js" checked on:change={onComputeTypeChange} />
      <label for="js-compute-type">JavaScript</label>
    </div>
    <div title={gpu.isSupported() || errorWithGPU ? "" : "Your browser does not support WebGPU."}>
      <input
        disabled={!gpu.isSupported() || errorWithGPU}
        type="radio"
        id="gpu-compute-type"
        name="compute-type"
        value="gpu"
        on:change={onComputeTypeChange}
      />
      <label for="gpu-compute-type" class:disabled={!gpu.isSupported() || errorWithGPU}>GPU</label>
      {#if !gpu.isSupported() || errorWithGPU}
        <span>(not supported)</span>
      {/if}
    </div>
  </fieldset>
  <div id="chart">
    <Chart data={fpsChartData} />
    <div id="fps">FPS: {currentFPS.toPrecision(3)}</div>
  </div>
</div>

<div>
  <div id="organism-count">{pixelCount.toLocaleString()} organisms</div>
  <input id="resize" type="range" value="0" on:change={resize} on:input={onResizeInput} style="width: 100%" />
</div>
<canvas bind:this={golCanvas} />

<style>
  #top-row {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    align-items: center;
  }
  #chart {
    position: relative;
    /* display: inline-block; */
    /* height: 10rem; */
  }
  #organism-count {
    text-align: center;
    font-size: 2rem;
  }
  #compute-type {
    height: fit-content;
  }
  #fps {
    float: right;
    font-weight: 700;
  }

  .disabled {
    text-decoration: line-through;
  }
</style>
