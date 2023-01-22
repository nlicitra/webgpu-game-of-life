export type GridState = Uint32Array;
export interface Dimensions {
  width: number;
  height: number;
}
interface Frame {
  gridState: GridState;
  dimensions: Dimensions;
}
