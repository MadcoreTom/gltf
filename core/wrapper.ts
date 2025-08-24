import { mat4, ReadonlyMat4 } from "gl-matrix";
import { Gltf, GltfAcceesor, GltfBufferView, GltfMaterial, GltfMeshPrimitive, GltfNode } from "./schema";
import { Shader } from "./shader";
import { getGlTypeForComponentType } from "./util";

// type MaterialAttr = {
//     materialToUniform: { [prop: string]: string };
// }

export class GltfWrapper {
    private nodeNames: Map<string, number> = new Map();
    private meshNames: Map<string, number> = new Map();
    private shaders: ShaderWrapper[] = [];
    private bufferViews: WebGLBuffer[] = []
    private nodeMats: mat4[] = [];
    private innerMaterials: ShaderWrapper[] = [];
    public constructor(private readonly gl: WebGL2RenderingContext, private readonly gltf: Gltf) {
        gltf.nodes.forEach((n, i) => {
            this.nodeNames.set(n.name as string, i);
        });
        gltf.meshes.forEach((m, i) => {
            m.name != null && this.meshNames.set(m.name, i);
        });
        console.log(this);
    }

    public addBuffer(data: ArrayBuffer, bufferIdx: number): GltfWrapper {
        const bufferViews = this.gltf.bufferViews
            .map((bv, i) => [bv, i] as [GltfBufferView, number])
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

        return this;
    }

    public addShader(shader: ShaderWrapper): GltfWrapper {
        this.shaders.push(shader);
        return this;
    }

    private calcInnerMaterialFromShader(materialIdx: number) {
        const mat = this.gltf.materials[materialIdx];
        const match = this.shaders.filter(s => s.test(mat))[0];
        this.innerMaterials[materialIdx] = match;
    }

    // private applyShader(primitive: GltfMeshPrimitive): Shader | undefined {
    //     // TODO probably cache materials, there's a bit of fiddling here we don't want to do per frame
    //     const mat = this.gltf.materials[primitive.material];
    //     this.assert(!!mat, "Material not found", primitive.material);
    //     const attributes = Object.keys(primitive.attributes);
    //     // console.log("ATTRS", attributes);

    //     // Find first shader that match the requirements
    //     // TODO maybe find best, or sort them first?
    //     const results = this.shaders.map(([attr, sh]) => {
    //         // matches if there are 0 not-found attr in attributes
    //         let matches = sh.getSupportedAttributes().filter(a => attributes.indexOf(a) < 0).length == 0;
    //         // matches if this property exists in the material     
    //         let uniforms: { [key: string]: any } = {};
    //         matches &&= Object.entries(attr.materialToUniform).filter(([path, uniform]) => {
    //             const parts = path.split(".");
    //             let cur = mat;
    //             while (parts.length > 0) {
    //                 const p = parts.shift() as string;
    //                 cur = cur[p];
    //                 // console.log(p,!!cur)
    //             }
                
    //             uniforms[uniform] = cur ? cur :  [0.5,0.5,0.5,1.0];
    //             return cur == undefined;
    //         }).length == 0; // no trues = nothing wasnt found (double negative)
    //         return {matches,uniforms,shader:sh};
    //     }).filter(s=>s.matches);
    //     const {shader,uniforms} = results[0];

    //     // TODO maybe it should get all the maps
    //     // needs to set the uniforms

    //     if (shader) {
    //         shader.useProgram();
    //         // apply uniforms
    //         Object.entries(uniforms).forEach(([k, v]) => shader.setVec4(k, v)); // TODO support more than vec4
    //         return shader;
    //     }

    //     return undefined;
    // }

    // function to render nodes by name or id
    // function to render mesh by name or id

    public drawMeshById(meshId: number, world:ReadonlyMat4, camera:ReadonlyMat4) {
        const mesh = this.gltf.meshes[meshId];
        this.assert(!!mesh, "Mesh not found", meshId);
        mesh.primitives.forEach(primitive => this.drawPrimitive(primitive, world, camera));
    }

    private drawPrimitive(primitive: GltfMeshPrimitive, world:ReadonlyMat4, camera:ReadonlyMat4) {
        let material = this.innerMaterials[primitive.material];
        if(material == undefined){
            this.calcInnerMaterialFromShader(primitive.material);
            material = this.innerMaterials[primitive.material];
            if(material == undefined){
                console.error("Failed to select materia for primitive", JSON.stringify(primitive, null, 2));
            }
        }
        material.use(this.gltf.materials[primitive.material]);
        // const shader = this.applyShader(primitive);
        const shader = material.shader;
        // it depends on the shader, which depends on available attributes plus material
        shader.forEachAttribute((name, loc) =>
            this.bindAccessorById(loc, primitive.attributes[name])
        );
        shader.setWorld(world);
        shader.setCamera(camera);
        // indices
        this.drawElementsByAccessorId(primitive.indices);

    }

    private bindAccessorById(location: GLuint, accessorIdx: number) {
        const ac: GltfAcceesor = this.gltf.accessors[accessorIdx];
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
        let componentCount = ac.type == "VEC2" ? 2 : 3; // TODO do better
        this.gl.vertexAttribPointer(location, componentCount, glType, false, 0, 0);
    }

    private drawElementsByAccessorId(accessorIdx: number) {
        const ac: GltfAcceesor = this.gltf.accessors[accessorIdx];
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

    public drawScene(scene: number, camera: mat4, world: mat4) {
        const s = this.gltf.scenes[scene];
        this.assert(!!s, "Scene not found", scene);
        s.nodes.forEach(nodeIdx =>
            this.walkNode(nodeIdx, camera, world, [])
        );
    }

    public getNodeByName(name:string): GltfNode |undefined{
        const idx = this.nodeNames.get(name);
        if(idx !== undefined){
            delete this.nodeMats[idx];
            return this.gltf.nodes[idx];
        }
        return undefined;
    }

    private walkNode(nodeIdx: number, camera: ReadonlyMat4, world: ReadonlyMat4, depth: number[]) {
        if (depth.length > 20) {
            console.warn("Depth exceeded with node", depth);
            return;
        }
        const node = this.gltf.nodes[nodeIdx];

        let mat = mat4.clone(world);;
        if (!this.nodeMats[nodeIdx]) {
            const nm = mat4.create();
            if (node.translation) {
                mat4.translate(nm, nm, node.translation);
            }
            if (node.rotation) {
                mat4.multiply(nm, nm, mat4.fromQuat(mat4.create(), node.rotation));
            }
            if (node.scale) {
                mat4.scale(nm, nm, node.scale);
            }
            this.nodeMats[nodeIdx] = nm;
        }
        mat4.multiply(mat, mat, this.nodeMats[nodeIdx]);

        if (node.mesh !== undefined) {
            this.drawMeshById(node.mesh, mat, camera);
        }

        if (node.children) {
            node.children.forEach(child => this.walkNode(child, camera, mat, [...depth, nodeIdx]));
        }
    }

    
    // private walkNode<S>(nodeIdx: number, state: S, callback: GltfNodeCallback<S>, depth:number[]) {
    //     if(depth.length > 20){
    //         console.warn("Depth exceeded with node", depth);
    //         return;
    //     }
    //     const childState = callback(nodeIdx, state, this);
    //     const node = this.gltf.nodes[nodeIdx];
    //     if (node.children) {
    //         node.children.forEach(child => this.walkNode(child, childState, callback, [...depth, nodeIdx]));
    //     }
    // }
}


// export type GltfNodeCallback<S> = (nodeIdx: number, state: S, gltfw: GltfWrapper) => S;



    // export class ShaderWrapper {
    //     public constructor(private readonly shader:Shader, private readonly attributesMapping:{paths:string[][],output:string}[]){

    //     }

    //     public matches(material:GltfMaterial):ShaderMaterial | null {
    //         const gsp:GetterSetterPair<any>[] = [];

    //         const matched = this.attributesMapping.filter(mapping=>{
    //             const matchingPath =  mapping.paths.filter(p=>this.getProperty(material,p) != undefined)[0];
    //         return matched == this.attributesMapping.length; 
    //         });
    //     }

    //     // public use(material:GltfMaterial){
    //     //     this.shader.useProgram();
    //     // }

    //     private getProperty(object:any, key:string[], depth:number=0):any {
    //         if(key[depth] in object){
    //             if(depth == key.length-1){
    //                 return object[key[depth]];
    //             } else {
    //                 return this.getProperty(object[key[depth]], key, depth+1)
    //             }
    //         }
    //         return undefined;
    //     }
    // }

    // type GetterSetterPair<T> = {
    //     getter: (material:GltfMaterial)=>T,
    //     setter: (shader:Shader, t:T)=>any
    // } 

    // export class ShaderMaterial {
    //     public constructor (private readonly shader:Shader, private readonly getterSetterPairs: GetterSetterPair<any>[]){

    //     }
        
    //     public use(material:GltfMaterial){
    //         this.shader.useProgram();
    //         this.getterSetterPairs.forEach(({getter,setter})=>{
    //             setter(this.shader, getter(material));
    //         });
    //     }
    // }

export class ShaderWrapper {
    public readonly use: (material: GltfMaterial) => void;

    public constructor(
        public readonly name,
        public readonly shader: Shader,
        public readonly test: (material: GltfMaterial) => boolean,
        useInternal: (shader: Shader, material: GltfMaterial) => void
    ) {
        this.use = (material: GltfMaterial) => {
            shader.useProgram();
            useInternal(shader, material);
        }
    }
}