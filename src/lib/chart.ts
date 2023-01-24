import Chart from "chart.js/auto";

export function makeChart(selector: string) {
  const canvas = document.querySelector(selector) as HTMLCanvasElement;

  return new Chart(canvas, {
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
          suggestedMax: 200,
          suggestedMin: 0,
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
          borderWidth: 2,
          data: [],
        },
      ],
    },
  });
}
