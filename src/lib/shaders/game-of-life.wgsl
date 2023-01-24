struct Dimensions {
    width: u32,
    height: u32
}
@group(0) @binding(0)
var<uniform> dimensions: Dimensions;

@group(0) @binding(1)
var<storage, read> input: array<u32>;

@group(0) @binding(2)
var<storage, read_write> output: array<u32>;

fn get_live_neighbors(index: u32) -> u32 {
    var size = i32(dimensions.width);
    var i = i32(index);
    var count = u32(0);
    if (i - 1) % size > 0 {
        count += input[i - 1];
    }
    if (i + 1) % size > 0 {
        count += input[i + 1];
    }
    if (i - size) % size >= 0 {
        if (i - size - 1) % size > 0 {
            count += input[i - size - 1];
        }
        count += input[i - size];
        if (i - size + 1) % size > 0 {
            count += input[i - size + 1];
        }
    }
    if (i + size) % size > 0 {
        if (i + size - 1) % size > 0 {
            count += input[i + size - 1];
        }
        count += input[i + size];
        if (i + size + 1) % size > 0 {
            count += input[i + size + 1];
        }
    }

    return count;
}

@compute @workgroup_size(200)
fn main(
    @builtin(global_invocation_id)
  global_id: vec3<u32>
) {
    var alive_neighbors = get_live_neighbors(global_id.x);
    if input[global_id.x] == u32(1) {
        if alive_neighbors < u32(2) {
            output[global_id.x] = u32(0);
        } else if alive_neighbors <= u32(3) {
            output[global_id.x] = u32(1);
        } else {
            output[global_id.x] = u32(0);
        }
    } else {
        if alive_neighbors == u32(3) {
            output[global_id.x] = u32(1);
        } else {
            output[global_id.x] = u32(0);
        }
    }
    // output[global_id.x] = input[global_id.x];
}