export function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(undefined);
    }, ms);
  });
}

export function randomize(array: Uint32Array) {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.random() > 0.5 ? 1 : 0;
  }
  return array;
}
