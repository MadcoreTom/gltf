#version 300 es
precision mediump float;

in vec2 uv;
in vec3 norm;
in vec3 vPos;

uniform vec4 uCol;

layout(location =0) out vec4 o_color;

void main(void){
 o_color = vec4(uCol.rgb, uCol.a);
}