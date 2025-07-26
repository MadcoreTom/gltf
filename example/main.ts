import { mat4, vec3 } from "gl-matrix";
import { Shader } from "../core/shader";
import { GltfWrapper2, load } from "../core/parser";

// customElements.define("tom-main", MainComponent);

// const time = new Float32Array([0,100,200]);
// const value = new Float32Array([0, 10, 20])
// const a = AnimationChannel.getTypedAnimationChannel("SCALAR", time, value);
// for(let i=0;i<400;i+=25){
//     console.log(i,a.getValue())
//     a.stepTime(25, true);
// }

const canvas = document.createElement("canvas");
canvas.style.width = "500px";
canvas.style.height = "500px";
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;



let s:Shader;
let g:GltfWrapper2;

async function doit(){
    s = await loadShader(gl, "assets/shaders/vert.glsl", "assets/shaders/frag-col.glsl");
    // const g = await load(gl, window.location.origin + "/assets/hand/", "scene.gltf");
    g = await load(gl, window.location.origin + "/assets/", "test3.gltf");
    g.addShader(
        s,
        {
            attributeToLocation: {
                "POSITION": 0,
                "NORMAL": 1,
                "TEXCOORD_0": 2
            },
            materialToUniform: {
                 "pbrMetallicRoughness.baseColorFactor": "col"
            }
        }
    );


    window.requestAnimationFrame(tick);
}

function tick(time:number){
    gl.clearColor(0.5, 0.5,0.5, 1);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.frontFace(gl.CW);
    gl.cullFace(gl.BACK);
    gl.enable(gl.DEPTH_TEST);
    s.useProgram();
    s.setMat4("model", mat4.fromRotation(mat4.create(), time / 1000, vec3.normalize(vec3.create(),[1,2,3])));
    s.setMat4("projection", mat4.create());
    s.setVec4("col", [1,0,0,1]);

    // TODO probably pass in matriciessince it might change the shader
    g.drawMeshById(0);
    window.requestAnimationFrame(tick);
}

doit();

 async function loadShader(gl: WebGL2RenderingContext, vertUri: string, fragUri: string): Promise<Shader> {
    const vertResponse = await fetch(vertUri);
    const fragResponse = await fetch(fragUri);
    const vertText = await vertResponse.text();
    const fragText = await fragResponse.text();
    return new Shader(gl, vertText, fragText).compile();
}