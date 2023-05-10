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

alias color = vec4<u32>;

@compute @workgroup_size(200)
fn main(
    @builtin(global_invocation_id)
  global_id: vec3<u32>
) {
    var deadColor = color(u32(50), u32(50), u32(50), u32(255));
    var aliveColor = color(u32(100), u32(200), u32(255), u32(255));
    var colors = array<color,2>(deadColor, aliveColor);
    var index = input[global_id.x];
    var color = colors[index];
    output[global_id.x] = color.r | (color.g << u32(1000)) | (color.b << u32(2000)) | (color.a << u32(3000));
}