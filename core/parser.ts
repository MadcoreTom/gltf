import { XGltf, XGltfAcceesor, XGltfBufferView, XGltfMeshPrimitive } from "./schema";
import { Shader } from "./shader";
import { getGlTypeForComponentType } from "./util";

export async function load(gl: WebGL2RenderingContext, baseUrl: string, path: string): Promise<GltfWrapper2> {
    // Load gltf
    const url = new URL(path, baseUrl);
    console.log("Loading", url)
    const response = await fetch(url);
    const gltf = await response.json() as XGltf;
    console.log("Loaded GLTF", gltf);

    const w = new GltfWrapper2(gl, gltf);

    // load bin
    const promises = gltf.buffers.map(async (b, i) => {
        const url = new URL(b.uri, baseUrl);
        const response = await fetch(url);
        const data = await response.arrayBuffer();

        w.addBuffer(data, i);
    });
    await Promise.all(promises);
    console.log("Loaded all buffers");

    // done

    return w;
}

type MaterialAttr = {
    attributeToLocation: { [attr: string]: number },
    materialToUniform: { [prop: string]: string };
}

export class GltfWrapper2 {
    private nodeNames: Map<string, number> = new Map();
    private meshNames: Map<string, number> = new Map();
    private shaders: [MaterialAttr, Shader][] = [];
    private bufferViews: WebGLBuffer[] = []
    public constructor(private readonly gl: WebGL2RenderingContext, private readonly gltf: XGltf) {
        gltf.nodes.forEach((n, i) => {
            this.nodeNames.set(n.name, i);
        });
        gltf.meshes.forEach((m, i) => {
            m.name != null && this.meshNames.set(m.name, i);
        });
        console.log(this);
    }

    public addBuffer(data: ArrayBuffer, bufferIdx: number) {
        const bufferViews = this.gltf.bufferViews
            .map((bv, i) => [bv, i] as [XGltfBufferView, number])
            .filter(([bv]) => bv.buffer == bufferIdx);

        bufferViews.forEach(([bv, i]) => {
            // TODO i know these numbers map to these enums of the same ordinal value
            const bufType: GLenum = bv.target == 34962 ? this.gl.ARRAY_BUFFER : this.gl.ELEMENT_ARRAY_BUFFER;
            const buf = this.gl.createBuffer();
            this.gl.bindBuffer(bufType, buf);
            const slice = data.slice(bv.byteOffset, bv.byteOffset + bv.byteLength);
            this.gl.bufferData(bufType, slice, WebGLRenderingContext.STATIC_DRAW);
            console.log("Loaded buffer view", i, "type", bufType, slice);
            this.bufferViews[i] = buf;
        });
    }

    public addShader(shader: Shader, attr: MaterialAttr) {
        this.shaders.push([attr, shader]);
    }

    private applyShader(primitive: XGltfMeshPrimitive): { [attr: string]: number } {
        // TODO probably cache materials, there's a bit of fiddling here we don't want to do per frame
        const mat = this.gltf.materials[primitive.material];
        this.assert(!!mat, "Material not found", primitive.material);
        const attributes = Object.keys(primitive.attributes);
        // console.log("ATTRS", attributes);
        let uniforms: { [key: string]: any } = {};

        // Find first shader that match the requirements
        // TODO maybe find best, or sort them first?
        const shader = this.shaders.filter(([attr]) => {
            // matches if there are 0 not-found attr in attributes
            let matches = Object.keys(attr.attributeToLocation).filter(a => attributes.indexOf(a) < 0).length == 0;
            // matches if this property exists in the material
            matches &&= Object.entries(attr.materialToUniform).filter(([path, uniform]) => {
                const parts = path.split(".");
                let cur = mat;
                while (parts.length > 0) {
                    const p = parts.shift() as string;
                    cur = cur[p];
                    if (!cur) {
                        console.warn("Could not find path", path, "in", mat)
                        return true; // true means it didnt match
                    }
                }
                uniforms[uniform] = cur;
                return false;
            }).length == 0; // no trues = nothing wasnt found (double negative)
            return matches;
        })[0];

        // TODO maybe it should get all the maps
        // needs to set the uniforms

        // console.log("SHADER", shader);

        if (shader) {
            shader[1].useProgram();
            // TODO get this mappnig from somewhere
            const r = {
                POSITION: shader[1].getLocation("pos"),
                NORMAL: shader[1].getLocation("norm"),
                TEXCOORD_0: shader[1].getLocation("tex")
            }
            // console.log(r);
            // apply uniforms
            Object.entries(uniforms).forEach(([k, v]) => shader[1].setVec4(k, v)); // TODO support more than vec4
            return r;
        }

        // TODO needs to return location map
        return {};
    }

    // function to render nodes by name or id
    // function to render mesh by name or id

    public drawMeshById(meshId: number) {
        const mesh = this.gltf.meshes[meshId];
        this.assert(!!mesh, "Mesh not found", meshId);
        mesh.primitives.forEach(primitive => this.drawPrimitive(primitive));
    }

    private drawPrimitive(primitive: XGltfMeshPrimitive) {
        // TODO - have the assumption of POSITION, NORMAL, TEXCOORD_0
        const loc = this.applyShader(primitive);
        // it depends on the shader, which depends on available attributes plus material
        this.bindAccessorById(loc.POSITION, primitive.attributes["POSITION"], 3);
        this.bindAccessorById(loc.NORMAL, primitive.attributes["NORMAL"], 3);
        this.bindAccessorById(loc.TEXCOORD_0, primitive.attributes["TEXCOORD_0"], 2);
        // indices
        this.drawElementsByAccessorId(primitive.indices);
    }

    private bindAccessorById(location: GLuint, accessorIdx: number, componentCount: number) {
        const ac: XGltfAcceesor = this.gltf.accessors[accessorIdx];
        this.assert(!!ac, "Accessor not found", accessorIdx);
        const glType = getGlTypeForComponentType(ac.componentType);
        this.assert(!!glType, "GL type not found from component type", ac.componentType);
        // console.log("GL TYpe", glType)

        // const bv: XGltfBufferView = this.gltf.bufferViews[ac.bufferView];
        // this.assert(!!bv, "buffer view not found", ac.bufferView);
        this.gl.enableVertexAttribArray(location);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bufferViews[ac.bufferView]);
        // TODO what the heck is bv.byteLength for?
        // this.gl.vertexAttribPointer(location, componentCount, glType, false, bv.byteStride || 0, bv.byteOffset);
        this.gl.vertexAttribPointer(location, componentCount, glType, false, 0, 0);
    }

    private drawElementsByAccessorId(accessorIdx: number) {
        const ac: XGltfAcceesor = this.gltf.accessors[accessorIdx];
        this.assert(!!ac, "Accessor not found", accessorIdx);
        const glType = getGlTypeForComponentType(ac.componentType);
        this.assert(!!glType, "GL type not found from component type", ac.componentType);

        // const bv: XGltfBufferView = this.gltf.bufferViews[ac.bufferView];
        // this.assert(!!bv, "buffer view not found", ac.bufferView);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.bufferViews[ac.bufferView]);


        // console.log("LENGTH",  ac.count, "gltype", glType)
        this.gl.drawElements(this.gl.TRIANGLES, ac.count, glType, 0); // TODO this should maybe be element length/offset
    }

    private assert(truth: boolean, message: string, ...args: any) {
        if (!truth) {
            console.warn(message, args);
        }
    }
}