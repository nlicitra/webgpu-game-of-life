export function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(undefined);
    }, ms);
  });
}

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Uint8ClampedArray
  | Float32Array
  | Float64Array;
export function randomize<T extends TypedArray>(array: T) {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.random() > 0.5 ? 1 : 0;
  }
  return array;
}
