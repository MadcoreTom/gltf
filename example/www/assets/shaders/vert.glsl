#version 300 es
precision mediump float;

in vec3 aPos;
in vec3 aNorm;
in vec2 aTex;

uniform mat4 uProjMat;
uniform mat4 uModelMat;
uniform vec2 uScale;

out vec3 norm;
out vec2 uv;
out vec3 vPos;

void main(void){
//     vec4 pos = uModelMat * vec4(aPos, 1.0) + aNorm.x * 0.0 + aTex.x * 0.0;
//     gl_Position = uProjMat * pos;
    // norm = aNorm;
    norm = normalize(uModelMat * vec4(aNorm, 0.0)).xyz;
     uv  =aTex;
//     vPos = vec3(pos.x/uScale.x, pos.y/uScale.y,pos.z);
gl_Position = uProjMat* uModelMat * vec4(aPos, 1.0) ;
}