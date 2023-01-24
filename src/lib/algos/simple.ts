import type { Frame, GridState } from "../types";
import { wait } from "../util";
import { Grid } from "../grid";

function getLiveNeighborCount(frame: Frame, index: number) {
  const { width, height } = frame.dimensions;
  const x = index % width;
  const y = Math.floor(index / width);
  // console.log(x, y);
  let count = 0;
  if (x < width - 1) {
    count += frame.gridState[index + 1];
  }
  if (x > 0) {
    count += frame.gridState[index - 1];
  }
  if (y > 0) {
    count += frame.gridState[index - width];
    if (x < width - 1) {
      count += frame.gridState[index - width + 1];
    }
    if (x > 0) {
      count += frame.gridState[index - width - 1];
    }
  }
  if (y < height - 1) {
    count += frame.gridState[index + width];
    if (x < width - 1) {
      count += frame.gridState[index + width + 1];
    }
    if (x > 0) {
      count += frame.gridState[index + width - 1];
    }
  }
  return count;
}

async function getNextState(frame: Frame): Promise<[GridState, Uint8ClampedArray]> {
  const newState = frame.gridState.slice();
  for (let i = 0; i < frame.gridState.length; i++) {
    const liveCount = getLiveNeighborCount(frame, i);
    if (frame.gridState[i]) {
      if (liveCount < 2 || liveCount > 3) {
        newState[i] = 0;
      } else {
        newState[i] = 1;
      }
    } else {
      if (liveCount === 3) {
        newState[i] = 1;
      } else {
        newState[i] = 0;
      }
    }
  }
  await wait(1);
  return [newState, Grid.getImageDataArrayFromState(newState)];
}

export default getNextState;
