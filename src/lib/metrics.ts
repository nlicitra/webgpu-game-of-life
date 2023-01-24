export class SlidingWindow {
  windowSize: number;
  buffer: number[];
  constructor(windowSize: number) {
    this.windowSize = windowSize;
    this.buffer = [];
  }

  register(data: number) {
    this.buffer.push(data);
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }
  }

  avg() {
    return this.buffer.reduce((total, d) => total + d, 0) / this.buffer.length;
  }

  reset() {
    this.buffer.length = 0;
  }
}
