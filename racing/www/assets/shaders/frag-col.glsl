#version 300 es
precision mediump float;

in vec2 uv;
in vec3 norm;
in vec3 vPos;

uniform vec4 uCol;

layout(location =0) out vec4 o_color;

void main(void){
 float light = norm.z * norm.z * 0.95 + norm.x * 0.25;
 light = 0.5 + 0.5 * light;
 light = 1.0 - ((1.0-light)*(1.0-light));
 o_color = vec4(uCol.rgb * light, uCol.a);
}