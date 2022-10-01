/// <reference types="@webgpu/types" />
import gameOfLifeShader from "./shaders/game-of-life.wgsl?raw";
import imageDataShader from "./shaders/image-data.wgsl?raw";

export async function setup(width: number, height: number) {
  if (!navigator.gpu) throw Error("WebGPU not supported.");

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error("Couldn’t request WebGPU adapter.");

  // console.log(adapter.limits);
  const device = await adapter.requestDevice();
  // console.log(device.limits);
  if (!device) throw Error("Couldn’t request WebGPU logical device.");

  const gameOfLifeModule = device.createShaderModule({
    code: gameOfLifeShader,
  });
  const imageDataModule = device.createShaderModule({
    code: imageDataShader,
  });

  const bindGroupLayout = device.createBindGroupLayout({
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

  const BUFFER_SIZE = width * height * 4;

  const dimensions = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  const mappedDimensions = new Uint32Array(dimensions.getMappedRange());
  mappedDimensions.set([width, height]);
  dimensions.unmap();

  const input = device.createBuffer({
    size: BUFFER_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const gameOfLifeOutput = device.createBuffer({
    size: BUFFER_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
  const gameOfLifeStagingBuffer = device.createBuffer({
    size: BUFFER_SIZE,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const output = device.createBuffer({
    size: BUFFER_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const stagingBuffer = device.createBuffer({
    size: BUFFER_SIZE,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: dimensions,
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
          buffer: gameOfLifeOutput,
        },
      },
    ],
  });

  const imageDataBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: dimensions,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: gameOfLifeOutput,
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

  const gameOfLifePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: gameOfLifeModule,
      entryPoint: "main",
    },
  });

  const imageDataPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: imageDataModule,
      entryPoint: "main",
    },
  });

  return async (state: Uint32Array): Promise<[Uint32Array, Uint8ClampedArray]> => {
    device.queue.writeBuffer(input, 0, state);

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(gameOfLifePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(BUFFER_SIZE / 200));
    passEncoder.setPipeline(imageDataPipeline);
    passEncoder.setBindGroup(0, imageDataBindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(BUFFER_SIZE / 200));
    passEncoder.end();
    commandEncoder.copyBufferToBuffer(
      gameOfLifeOutput,
      0, // Source offset
      gameOfLifeStagingBuffer,
      0, // Destination offset
      BUFFER_SIZE
    );
    commandEncoder.copyBufferToBuffer(
      output,
      0, // Source offset
      stagingBuffer,
      0, // Destination offset
      BUFFER_SIZE
    );
    const commands = commandEncoder.finish();
    device.queue.submit([commands]);

    await Promise.all([
      gameOfLifeStagingBuffer.mapAsync(
        GPUMapMode.READ,
        0, // Offset
        BUFFER_SIZE // Length
      ),
      stagingBuffer.mapAsync(
        GPUMapMode.READ,
        0, // Offset
        BUFFER_SIZE // Length
      ),
    ]);
    let copyArrayBuffer = gameOfLifeStagingBuffer.getMappedRange(0, BUFFER_SIZE);
    const gameStateData = copyArrayBuffer.slice(0);
    gameOfLifeStagingBuffer.unmap();

    copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);
    const imageData = copyArrayBuffer.slice(0);
    stagingBuffer.unmap();
    return [new Uint32Array(gameStateData), new Uint8ClampedArray(imageData)];
  };
}
