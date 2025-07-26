import { mat4, vec3 } from "gl-matrix";
import { load } from "../../core/parser";
import { loadShader, Shader } from "../../core/shader";
import { GltfWrapper } from "../../core/wrapper";

export class MainComponent extends HTMLElement {
    private canvas: HTMLCanvasElement;
    private gl: WebGL2RenderingContext;
    private gltf: GltfWrapper;
    private shader: Shader; // TODO remove

    constructor() {
        super();
    }

    connectedCallback() {
        const vw = parseInt(this.getAttribute("width") || "400");
        const vh = parseInt(this.getAttribute("height") || "400");

        const shadowRoot = this.attachShadow({ mode: "open" });

        this.canvas = document.createElement("canvas");
        this.canvas.width = vw;
        this.canvas.height = vh;
        shadowRoot.appendChild(this.canvas);

        // handlers
        this.canvas.addEventListener("click", evt => { this.onClick(evt.offsetX, evt.offsetY, true) });
        this.canvas.addEventListener("contextmenu", evt => { this.onClick(evt.offsetX, evt.offsetY, false); evt.preventDefault() });

        // Load content
        this.gl = this.canvas.getContext("webgl2") as WebGL2RenderingContext;
        this.load();
    }

    private async load() {
        this.gltf = await load(this.gl, window.location.origin + "/assets/", "test3.gltf");
        // shaders
        this.shader = await loadShader(this.gl, "assets/shaders/vert.glsl", "assets/shaders/frag-col.glsl");
        this.gltf.addShader(
            this.shader,
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

        console.log("Ready for the first frame")
        window.requestAnimationFrame(t=>this.onFrame(t));
    }

    private onFrame(time: number) {
        const { gl, gltf, shader } = this;
        gl.clearColor(0.5, 0.5, 0.5, 1);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        gl.disable(gl.CULL_FACE);
        gl.frontFace(gl.CW);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);
        // TODO id rather not change values from the outside
        shader.useProgram();
        shader.setMat4("model", mat4.fromRotation(mat4.create(), time / 1000, vec3.normalize(vec3.create(), [1, 2, 3])));
        shader.setMat4("projection", mat4.create());

        // TODO probably pass in matriciessince it might change the shader
        gltf.drawMeshById(0);
        window.requestAnimationFrame(t=>this.onFrame(t));
    }

    private onClick(x: number, y: number, left: boolean) {
        console.log("CLICK", x, y);
    }
}