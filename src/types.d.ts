export type GridState = Uint8Array;
export interface Dimensions {
  width: number;
  height: number;
}
interface Frame {
  gridState: GridState;
  dimensions: Dimensions;
}
