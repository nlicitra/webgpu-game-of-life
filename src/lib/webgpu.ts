/// <reference types="@webgpu/types" />
import gameOfLifeShader from "./shaders/game-of-life.wgsl?raw";
import imageDataShader from "./shaders/image-data.wgsl?raw";
import type { Dimensions, GridState } from "./types";
import { browser } from "$app/environment";

interface GPUModule {
  buffers: Record<string, GPUBuffer>;
  bufferSize: number;
  bindGroup: GPUBindGroup;
  pipeline: GPUComputePipeline;
}

export class WebGPUGameOfLife {
  adapter: GPUAdapter;
  device: GPUDevice;
  gameDimensions: Dimensions;
  gameOfLifeModule: GPUModule;
  imageDataModule: GPUModule;
  bindGroupLayout: GPUBindGroupLayout;
  shaderModules: {
    gameOfLife: GPUShaderModule;
    imageData: GPUShaderModule;
  };
  buffers: {
    dimensions?: GPUBuffer;
  };
  private _onFrameGenerated?: () => void;

  constructor() {
    this.buffers = {
      dimensions: undefined,
    };
  }

  isSupported() {
    return browser && Boolean(navigator.gpu);
  }

  async init(dimensions: Dimensions) {
    if (!navigator.gpu) throw new Error("WebGPU not supported.");

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("Couldn’t request WebGPU adapter.");
    this.adapter = adapter;

    // console.log(adapter.limits);
    const device = await adapter.requestDevice();
    // console.log(device.limits);
    if (!device) throw new Error("Couldn’t request WebGPU logical device.");
    this.device = device;

    this.shaderModules = {
      gameOfLife: device.createShaderModule({ code: gameOfLifeShader }),
      imageData: device.createShaderModule({ code: imageDataShader }),
    };

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "uniform",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "storage",
          },
        },
      ],
    });

    this.updateDimensions(dimensions);
  }

  private destroyBuffers(buffers: GPUBuffer[]) {
    buffers.forEach((b) => {
      if (b.mapState === "pending") {
        setTimeout(() => {
          b.destroy();
        }, 500);
      } else {
        b.destroy();
      }
    });
  }

  async initGameOfLifeModule() {
    const { width, height } = this.gameDimensions;
    const BUFFER_SIZE = width * height * 4;
    const input = this.device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const output = this.device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    const staging = this.device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.buffers.dimensions!,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: input,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: output,
          },
        },
      ],
    });

    const pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      compute: {
        module: this.shaderModules.gameOfLife,
        entryPoint: "main",
      },
    });

    const oldBuffers = Object.values(this.gameOfLifeModule?.buffers || {});
    this.gameOfLifeModule = {
      pipeline,
      bindGroup,
      bufferSize: BUFFER_SIZE,
      buffers: {
        input,
        output,
        staging,
      },
    };
    if (oldBuffers?.length) {
      this.destroyBuffers(oldBuffers);
    }
  }

  initImageDataModule() {
    const { width, height } = this.gameDimensions;
    const BUFFER_SIZE = width * height * 4;
    const output = this.device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const staging = this.device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.buffers.dimensions!,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.gameOfLifeModule?.buffers.output!,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: output,
          },
        },
      ],
    });

    const pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      compute: {
        module: this.shaderModules.imageData,
        entryPoint: "main",
      },
    });

    const oldBuffers = Object.values(this.imageDataModule?.buffers || {});
    this.imageDataModule = {
      pipeline,
      bindGroup,
      bufferSize: BUFFER_SIZE,
      buffers: {
        output,
        staging,
      },
    };
    if (oldBuffers?.length) {
      this.destroyBuffers(oldBuffers);
    }
  }

  onNextFrameGenerated(fn: () => void) {
    this._onFrameGenerated = fn;
  }

  updateDimensions({ width, height }: Dimensions) {
    this.gameDimensions = { width, height };

    const dimensions = this.device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    const mappedDimensions = new Uint32Array(dimensions.getMappedRange());
    mappedDimensions.set([width, height]);
    dimensions.unmap();
    if (this.buffers.dimensions) {
      this.destroyBuffers([this.buffers.dimensions]);
    }
    this.buffers.dimensions = dimensions;

    this.initGameOfLifeModule();
    this.initImageDataModule();
  }

  async process(state: GridState): Promise<[GridState, Uint8ClampedArray]> {
    this.device.queue.writeBuffer(this.gameOfLifeModule.buffers.input, 0, state);

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.gameOfLifeModule.pipeline);
    passEncoder.setBindGroup(0, this.gameOfLifeModule.bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(this.gameOfLifeModule.bufferSize / 200));
    passEncoder.setPipeline(this.imageDataModule.pipeline);
    passEncoder.setBindGroup(0, this.imageDataModule.bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(this.imageDataModule.bufferSize / 200));
    passEncoder.end();
    commandEncoder.copyBufferToBuffer(
      this.gameOfLifeModule.buffers.output,
      0, // Source offset
      this.gameOfLifeModule.buffers.staging,
      0, // Destination offset
      this.gameOfLifeModule.buffers.output.size
    );
    commandEncoder.copyBufferToBuffer(
      this.imageDataModule.buffers.output,
      0, // Source offset
      this.imageDataModule.buffers.staging,
      0, // Destination offset
      this.imageDataModule.buffers.output.size
    );
    const commands = commandEncoder.finish();
    this.device.queue.submit([commands]);

    await Promise.all([
      this.gameOfLifeModule.buffers.staging.mapAsync(
        GPUMapMode.READ,
        0, // Offset
        this.gameOfLifeModule.buffers.staging.size // Length
      ),
      this.imageDataModule.buffers.staging.mapAsync(
        GPUMapMode.READ,
        0, // Offset
        this.imageDataModule.buffers.staging.size // Length
      ),
    ]);
    let copyArrayBuffer = this.gameOfLifeModule.buffers.staging.getMappedRange(
      0,
      this.gameOfLifeModule.buffers.staging.size
    );
    const gameStateData = copyArrayBuffer.slice(0);
    this.gameOfLifeModule.buffers.staging.unmap();

    copyArrayBuffer = this.imageDataModule.buffers.staging.getMappedRange(0, this.imageDataModule.buffers.staging.size);
    const imageData = copyArrayBuffer.slice(0);
    this.imageDataModule.buffers.staging.unmap();
    if (this._onFrameGenerated) {
      this._onFrameGenerated();
      this._onFrameGenerated = undefined;
    }
    return [new Uint32Array(gameStateData), new Uint8ClampedArray(imageData)];
  }
}
