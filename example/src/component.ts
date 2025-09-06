import { mat4, vec3, vec4 } from "gl-matrix";
import { load } from "../../core/parser";
import { ShaderBuilder } from "../../core/shader";
import { GltfWrapper, ShaderWrapper } from "../../core/wrapper";
import { TextureCache } from "../../core/textureCache";
import { Gltf } from "../../core/schema";

const DEMOS: [string, string][] = [
    ["/assets/", "test3.gltf"],
    ["/assets/", "monkey.gltf"],
    ["/assets/", "windmill.gltf"],
    ["/assets/notmine/", "scene.gltf"],
    ["/assets/car/", "untitled.gltf"],
    ["/assets/", "textured_cube.gltf"],
    ["/assets/", "anim_cube.gltf"],
    ["/assets/", "room.gltf"]
]

export class MainComponent extends HTMLElement {
    private canvas: HTMLCanvasElement;
    private gl: WebGL2RenderingContext;
    private gltf: GltfWrapper;
    private textureCache: TextureCache;
    shadowRoot: ShadowRoot;

    constructor() {
        super();
    }

    connectedCallback() {
        const vw = parseInt(this.getAttribute("width") || "400");
        const vh = parseInt(this.getAttribute("height") || "400");

        const shadowRoot = this.attachShadow({ mode: "open" });
        this.shadowRoot = shadowRoot;

        this.canvas = document.createElement("canvas");
        this.canvas.width = vw;
        this.canvas.height = vh;
        shadowRoot.appendChild(this.canvas);

        // handlers
        this.canvas.addEventListener("click", evt => { this.onClick(evt.offsetX, evt.offsetY, true) });
        this.canvas.addEventListener("contextmenu", evt => { this.onClick(evt.offsetX, evt.offsetY, false); evt.preventDefault() });

        // list demos
        const list = document.createElement("ul");
        list.style.color = "white";
        DEMOS.forEach(d => {
            const item = document.createElement("li");
            list.appendChild(item);

            const link = document.createElement("a");
            link.href = "?name=" + d[1];
            link.textContent = d[1];
            link.style.color = "yellow";
            item.appendChild(link);
        });
        shadowRoot.appendChild(list);

        // Load content
        const selected = new URLSearchParams(window.location.search).get("name") || DEMOS[0][1];
        const demo = DEMOS.filter(d => d[1] === selected);
        demo.push(DEMOS[0]); // default
        this.gl = this.canvas.getContext("webgl2") as WebGL2RenderingContext;
        this.textureCache = new TextureCache(this.gl); 
        this.load(...demo[0]);
    }

    private async load(dir: string, name: string) {
        this.gltf = await load(this.gl, window.location.origin + window.location.pathname+ dir, name, this.textureCache);
        // shaders
        // this.shader = await loadShader(this.gl, "assets/shaders/vert.glsl", "assets/shaders/frag-col.glsl");
        
        const shaderEmissive = await new ShaderBuilder(this.gl)
            .vert("assets/shaders/vert.glsl")
            .frag("assets/shaders/frag-emissive.glsl")
            .worldMat("uModelMat")
            .cameraMat("uProjMat")
            .attribute("aPos", "POSITION")
            .attribute("aNorm", "NORMAL")
            // .attribute("aTex", "TEXCOORD_0")
            .build();

        this.gltf.addShader(new ShaderWrapper(
            "Emissive",
            shaderEmissive,
            (material) => material.emissiveFactor != undefined,
            (shader, material) => {
                shader.setVec4("col", material.emissiveFactor as vec4)
            }
        ));
        const shader = await new ShaderBuilder(this.gl)
            .vert("assets/shaders/vert.glsl")
            .frag("assets/shaders/frag-col.glsl")
            .worldMat("uModelMat")
            .cameraMat("uProjMat")
            .attribute("aPos", "POSITION")
            .attribute("aNorm", "NORMAL")
            // .attribute("aTex", "TEXCOORD_0")
            .build();


        this.gltf.addShader(new ShaderWrapper(
            "BaseColor",
            shader,
            (material) => material.pbrMetallicRoughness?.baseColorFactor != undefined,
            (shader, material) => {
                shader.setVec4("col", material.pbrMetallicRoughness?.baseColorFactor as vec4)
            }
        ));
        const shaderTex = await new ShaderBuilder(this.gl)
            .vert("assets/shaders/vert.glsl")
            .frag("assets/shaders/frag-tex.glsl")
            .worldMat("uModelMat")
            .cameraMat("uProjMat")
            .attribute("aPos", "POSITION")
            .attribute("aNorm", "NORMAL")
            .attribute("aTex", "TEXCOORD_0")
            .build();

        this.gltf.addShader(new ShaderWrapper(
            "Textured",
            shaderTex,
            (material) => material.pbrMetallicRoughness?.baseColorTexture?.index != undefined,
            (shader, material, gltf, textures) => {
                // shader.setVec4("col", material.emissiveFactor as vec4)
                const idx = material.pbrMetallicRoughness?.baseColorTexture?.index;
                if(idx != undefined){
                    const tex = gltf.textures ? gltf.textures[idx] : undefined;
                    if(tex){
                        const img = textures[tex.source];
                        this.gl.bindTexture(this.gl.TEXTURE_2D, img);
                    }
                }
            }
        ));

        // the rset
        this.gltf.addShader(new ShaderWrapper(
            "CatchAll",
            shaderEmissive,
            (material) => true,
            (shader, material) => {
                shader.setVec4("col", [0.5, 0.5, 0.5, 1.0]);
            }
        ));

        const nodeTree = document.createElement("ul");
        nodeTree.style.color = "white";
        this.shadowRoot.appendChild(nodeTree);

        this.gltf.gltf.scenes[0].nodes.forEach(n=>this.printNode(this.gltf.gltf, n, 0, nodeTree))

        console.log("Ready for the first frame")
        window.requestAnimationFrame(t => this.onFrame(t));
    }

    private printNode(gltf:Gltf, nodeIdx:number,depth:number, elem: HTMLElement){
        const n = gltf.nodes[nodeIdx];
        let str = "▶️";
        for(let i=0;i<depth;i++){
            str += "  "
        }
        console.log(str + n.name);
        const nodeTree = document.createElement("li");
        nodeTree.textContent = `${n.name} - [${nodeIdx}]`;
        elem.appendChild(nodeTree);
        if(n.children){
            const childList = document.createElement("ul");
        nodeTree.appendChild(childList);
            n.children.forEach(c=>this.printNode(gltf,c,depth+1,childList));
        }
    }

    private onFrame(time: number) {
        const { gl, gltf } = this;
        gl.clearColor(56 / 225 * 0.7, 59 / 225 * 0.7, 72 / 225 * 0.7, 1);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        gl.disable(gl.CULL_FACE);
        gl.frontFace(gl.CW);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this.gltf.applyAnim((time % 1000) / 24 * 50 / 1000);

        const world = mat4.fromRotation(mat4.create(), time / 1000, vec3.normalize(vec3.create(), [-3, 2 + 9 * Math.sin(time / 2000), -1]));
        mat4.rotate(world, world, Math.PI, [0, 0, 1]);
        const camera = mat4.translate(mat4.create(), mat4.perspective(mat4.create(), 80, 1, 0.1, 100), [0, 0, -2]);

        // gltf.drawMeshById(0, world, camera);
        gltf.drawScene(0, camera, world);
        window.requestAnimationFrame(t => this.onFrame(t));
    }

    private onClick(x: number, y: number, left: boolean) {
        console.log("CLICK", x, y);
    }
}