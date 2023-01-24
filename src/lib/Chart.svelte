<script lang="ts">
  import Chart from "chart.js/auto";
  import { onMount } from "svelte";
  export let data: number[];

  let canvas: HTMLCanvasElement;
  let chart: Chart;

  onMount(() => {
    chart = new Chart(canvas, {
      type: "line",
      options: {
        events: [],
        animation: false,
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            suggestedMax: 150,
            min: 0,
            grid: {
              display: true,
            },
          },
        },
        elements: {
          point: {
            pointStyle: false,
          },
        },
      },
      data: {
        labels: Array(100).map((x) => ""),
        datasets: [
          {
            label: "FPS",
            backgroundColor: "tomato",
            borderColor: "tomato",
            borderWidth: 2,
            data,
          },
        ],
      },
    });
  });

  $: if (chart) {
    chart.data.datasets[0].data = data;
    chart.data.labels = data.map((_) => "");
    chart.update();
  }
</script>

<canvas bind:this={canvas} />

<style>
</style>
