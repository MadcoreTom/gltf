import { mat4, quat2, vec3 } from "gl-matrix";
import { load } from "../../core/parser";
import { ShaderBuilder } from "../../core/shader";
import { GltfWrapper } from "../../core/wrapper";
import { Keyboard } from "./keyboard";
import { initState, State } from "./state";
import { Controls } from "./const";
import { updateCar } from "./car";


export class MainComponent extends HTMLElement {
    private canvas: HTMLCanvasElement;
    private gl: WebGL2RenderingContext;
    private gltf: GltfWrapper;
    private track: GltfWrapper;
    private vw: number;
    private vh: number;
    private state: State;

    constructor() {
        super();
    }

    connectedCallback() {
        this.vw = parseInt(this.getAttribute("width") || "400");
        this.vh = parseInt(this.getAttribute("height") || "400");

        const shadowRoot = this.attachShadow({ mode: "open" });

        this.canvas = document.createElement("canvas");
        this.canvas.width = this.vw;
        this.canvas.height = this.vh;
        shadowRoot.appendChild(this.canvas);

        // handlers
        this.canvas.addEventListener("click", evt => { this.onClick(evt.offsetX, evt.offsetY, true) });
        this.canvas.addEventListener("contextmenu", evt => { this.onClick(evt.offsetX, evt.offsetY, false); evt.preventDefault() });

        // Load content
        this.gl = this.canvas.getContext("webgl2") as WebGL2RenderingContext;
        this.load("assets/car/", "untitled.gltf");

    }

    private async load(dir: string, name: string) {
        this.gltf = await load(this.gl, dir, name);
        // shaders
        // this.shader = await loadShader(this.gl, "assets/shaders/vert.glsl", "assets/shaders/frag-col.glsl");
        const shader = await new ShaderBuilder(this.gl)
            .vert("assets/shaders/vert.glsl")
            .frag("assets/shaders/frag-col.glsl")
            .worldMat("uModelMat")
            .cameraMat("uProjMat")
            .attribute("aPos", "POSITION")
            .attribute("aNorm", "NORMAL")
            .attribute("aTex", "TEXCOORD_0")
            .build();
        this.gltf.addShader(
            shader,
            {
                materialToUniform: {
                    "emissiveFactor": "col"
                }
            }
        );
        this.gltf.addShader(
            shader,
            {
                materialToUniform: {
                    "pbrMetallicRoughness.baseColorFactor": "col"
                }
            }
        );

        // track
   this.track = await load(this.gl, "assets/", "debug.gltf");
        // shaders
        this.track.addShader(
            shader,
            {
                materialToUniform: {
                    "emissiveFactor": "col"
                }
            }
        );
        this.track.addShader(
            shader,
            {
                materialToUniform: {
                    "pbrMetallicRoughness.baseColorFactor": "col"
                }
            }
        );

        const keybord = new Keyboard(window, {
            "KeyW": Controls.ACCEL,
            "ArrowUp": Controls.ACCEL,
            "KeyS": Controls.DECEL,
            "ArrowDown": Controls.DECEL,
            "KeyA": Controls.LEFT,
            "ArrowLeft": Controls.LEFT,
            "KeyD": Controls.RIGHT,
            "ArrowRight": Controls.RIGHT,
            "KeyC": Controls.CAMERA_MODE
        });

        this.state = initState(keybord, this.gltf, this.track);

        console.log("Ready for the first frame")
        window.requestAnimationFrame(t => this.onFrame(t));
    }

    private onFrame(time: number) {
        const { gl, gltf, state } = this;
        gl.clearColor(0.047, 0.800, 0.996, 1);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        gl.disable(gl.CULL_FACE);
        gl.frontFace(gl.CW);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        // Camera
        const lookAt = state.camera.target;
        {
            if(state.keyboard.isTyped(Controls.CAMERA_MODE)){
                state.cameraMode = (state.cameraMode+1)%4
            }
            switch(state.cameraMode){
                case 0:
                    state.camera.eye = [-6, 5, 0];
                    vec3.set(lookAt,this.state.car.pos[0],3,this.state.car.pos[2]);
                    break;
                case 1:
                    state.camera.eye = [state.car.pos[0] + Math.cos(state.car.yaw)*5, 5, state.car.pos[2] - Math.sin(state.car.yaw)*5];
                    vec3.set(lookAt,this.state.car.pos[0],3,this.state.car.pos[2]);
                    break;
                case 2:
                    state.camera.eye = [state.car.pos[0] + Math.cos(state.car.yaw), 10, state.car.pos[2] - Math.sin(state.car.yaw)];
                    vec3.set(lookAt,this.state.car.pos[0],0,this.state.car.pos[2]);
                    break;
                case 3:
                    // state.camera.eye = [state.car.pos[0] + Math.cos(state.car.yaw), 10, state.car.pos[2] - Math.sin(state.car.yaw)];
                    const dx = state.car.pos[0] - state.camera.eye[0];
                    const dz = state.car.pos[2] - state.camera.eye[2];
                    const len = Math.sqrt(dx*dx+dz*dz);
                    if(len > 4){
                        console.log("Drag")
                        state.camera.eye[0] += dx / len * (len-4);
                        state.camera.eye[2] += dz / len * (len-4);
                    } else {
                        console.log(len);
                    }
                    state.camera.eye[1] = 6;
                    vec3.set(lookAt,this.state.car.pos[0],0,this.state.car.pos[2]);
                    break;
            }
        }

        const world = mat4.create();//mat4.fromRotation(mat4.create(), time / 1000, vec3.normalize(vec3.create(), [-3, 2 + 9 * Math.sin(time / 2000), -1]));
        mat4.translate(world, world, this.state.car.pos);
        mat4.rotateY(world, world, this.state.car.yaw);
        // mat4.rotate(world, world, Math.PI, [0, 0, 1]);
        const camera = mat4.create();
        mat4.perspective(camera, 80, this.vw / this.vh, 0.1, 100);
        mat4.multiply(camera, camera, mat4.lookAt(mat4.create(), this.state.camera.eye, lookAt, [0,-1,0]));
        // const camera = mat4.translate(mat4.create(), mat4.perspective(mat4.create(), 80, this.vw / this.vh, 0.1, 100), [0, 0, -3]);

        // updates
        this.state.deltaTime = Math.min(100, time - this.state.time);
        this.state.time = time;
        updateCar(this.state);

        // gltf.drawMeshById(0, world, camera);
        gltf.drawScene(0, camera, world);
        this.track.drawScene(0, camera, mat4.create());
        window.requestAnimationFrame(t => this.onFrame(t));

    }

    private onClick(x: number, y: number, left: boolean) {
        console.log("CLICK", x, y);
    }
}