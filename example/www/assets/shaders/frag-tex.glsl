#version 300 es
precision mediump float;

in vec2 uv;
in vec3 norm;
in vec3 vPos;

uniform sampler2D uTex;

layout(location =0) out vec4 o_color;

void main(void){
    float light = norm.z * norm.z * 0.95 + norm.x * 0.25;
    light = 0.5 + 0.5 * light;
    light = 1.0 - ((1.0-light)*(1.0-light));
    o_color = vec4(texture(uTex, vec2(uv.x,1.0-uv.y)).rgb * light, 1.0);
}