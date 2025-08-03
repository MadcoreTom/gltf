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
        this.load("/assets/car/", "untitled.gltf");

    }

    private async load(dir: string, name: string) {
        this.gltf = await load(this.gl, window.location.origin + dir, name);
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

        const keybord = new Keyboard(window, {
            "KeyW": Controls.ACCEL,
            "ArrowUp": Controls.ACCEL,
            "KeyA": Controls.LEFT,
            "ArrowLeft": Controls.LEFT,
            "KeyD": Controls.RIGHT,
            "ArrowRight": Controls.RIGHT
        });

        this.state = initState(keybord, this.gltf);

        console.log("Ready for the first frame")
        window.requestAnimationFrame(t => this.onFrame(t));
    }

    private onFrame(time: number) {
        const { gl, gltf } = this;
        gl.clearColor(56 / 225 * 0.7, 59 / 225 * 0.7, 72 / 225 * 0.7, 1);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        gl.disable(gl.CULL_FACE);
        gl.frontFace(gl.CW);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        const world = mat4.fromRotation(mat4.create(), time / 1000, vec3.normalize(vec3.create(), [-3, 2 + 9 * Math.sin(time / 2000), -1]));
        mat4.rotate(world, world, Math.PI, [0, 0, 1]);
        const camera = mat4.translate(mat4.create(), mat4.perspective(mat4.create(), 80, this.vw / this.vh, 0.1, 100), [0, 0, -3]);

        // updates
        this.state.deltaTime = Math.min(100, time - this.state.time);
        this.state.time = time;
        updateCar(this.state);

        // gltf.drawMeshById(0, world, camera);
        gltf.drawScene(0, camera, world);
        window.requestAnimationFrame(t => this.onFrame(t));

    }

    private onClick(x: number, y: number, left: boolean) {
        console.log("CLICK", x, y);
    }
}