import { mat4, ReadonlyMat4 } from "gl-matrix";
import { Gltf, GltfAcceesor, GltfAnimation, GltfBufferView, GltfMaterial, GltfMeshPrimitive, GltfNode } from "./schema";
import { Shader } from "./shader";
import { getGlTypeForComponentType } from "./util";
import { TextureCache } from "./textureCache";
import { Animation ,AnimationChannelVec3 } from "./animation";

export class GltfWrapper {
    private nodeNames: Map<string, number> = new Map();
    private meshNames: Map<string, number> = new Map();
    private shaders: ShaderWrapper[] = [];
    private bufferViews: WebGLBuffer[] = []
    private nodeMats: mat4[] = [];
    private innerMaterials: ShaderWrapper[] = [];
    private innerTextures: WebGLTexture[] = [];
    private animationBufferViews: Float32Array[] = [];
    private innerAnimations: Animation[] = [];
    public constructor(private readonly gl: WebGL2RenderingContext, public readonly gltf: Gltf, private readonly baseUrl:string, private readonly textureCache?: TextureCache) {

        gltf.nodes.forEach((n, i) => {
            this.nodeNames.set(n.name as string, i);
        });

        gltf.meshes.forEach((m, i) => {
            m.name != null && this.meshNames.set(m.name, i);
        });

        if (textureCache && gltf.images) {
            gltf.images.forEach((img, i) => {
                console.log("IMAGE", img);
                this.innerTextures[i] = textureCache.loadOrGet(baseUrl + "/" + img.uri);
            });
        }
        console.log(this);
    }

    private loadAnimation(animation:GltfAnimation, idx:number){
        const innerAnim :Animation = {};
        animation.channels.forEach(channel => {

            const sampler = animation.samplers[channel.sampler];
            const time = this.animationBufferViews[sampler.input];
            const value = this.animationBufferViews[sampler.output];
            switch(channel.target.path){
                case "scale":
                    innerAnim.scale = new AnimationChannelVec3(channel, time, value);
                    break;
                case "translation":
                    innerAnim.translation = new AnimationChannelVec3(channel, time, value);
                    break;
            }
        });
        this.innerAnimations[idx] = innerAnim;
    }

    public addBuffer(data: ArrayBuffer, bufferIdx: number): GltfWrapper {
        const bufferViews = this.gltf.bufferViews
            .map((bv, i) => [bv, i] as [GltfBufferView, number])
            .filter(([bv]) => bv.buffer == bufferIdx);

        // TODO could build a list of referenced bufferviews from primitives, and another for references via animations

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


        // then load animation buffers
        if (this.gltf.animations) {
            this.gltf.animations.forEach(anim => {
                console.log("anim", anim)
                anim.channels.forEach(ch => {

                    console.log("channel", ch);
                    const {input, output} = anim.samplers[ch.sampler]; // these are buffer view indexes
                    [input, output].forEach(bufferViewIdx => {
                        const bv = this.gltf.bufferViews[bufferViewIdx];
                        const slice = data.slice(bv.byteOffset, bv.byteOffset + bv.byteLength);
                        this.animationBufferViews[bufferViewIdx] = new Float32Array(slice);
                    })
                });
            })
        }

        // TODO this happens after buffers are laoded, but will potentially replacer some or run multiple times if there are more than one buffer
        

        if(this.gltf.animations){
            this.gltf.animations.forEach((a,i) => this.loadAnimation(a, i));
        }


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

    // function to render nodes by name or id
    // function to render mesh by name or id

    public drawMeshById(meshId: number, world: ReadonlyMat4, camera: ReadonlyMat4) {
        const mesh = this.gltf.meshes[meshId];
        this.assert(!!mesh, "Mesh not found", meshId);
        mesh.primitives.forEach(primitive => this.drawPrimitive(primitive, world, camera));
    }

    private drawPrimitive(primitive: GltfMeshPrimitive, world: ReadonlyMat4, camera: ReadonlyMat4) {
        let material = this.innerMaterials[primitive.material];
        if (material == undefined) {
            this.calcInnerMaterialFromShader(primitive.material);
            material = this.innerMaterials[primitive.material];
            if (material == undefined) {
                console.error("Failed to select materia for primitive", JSON.stringify(primitive, null, 2));
            }
        }
        material.use(this.gltf.materials[primitive.material], this.gltf, this.innerTextures);
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

    public getNodeByName(name: string): GltfNode | undefined {
        const idx = this.nodeNames.get(name);
        if (idx !== undefined) {
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


    public applyAnim(time: number) {
        this.gltf.animations?.forEach((animation, ai) => {
            const anim = this.innerAnimations[ai];
            if (anim.scale) {
                const node = this.gltf.nodes[anim.scale.gltfChannel.target.node];
                node.scale = anim.scale.getValueAtTime(time);
                // invalidate cache mat
                delete this.nodeMats[anim.scale.gltfChannel.target.node];
            }
            if (anim.translation) {
                const node = this.gltf.nodes[anim.translation.gltfChannel.target.node];
                node.translation = anim.translation.getValueAtTime(time);
                // invalidate cache mat
                delete this.nodeMats[anim.translation.gltfChannel.target.node];
            }
        })
    }

}

export class ShaderWrapper {
    public readonly use: (material: GltfMaterial,gltf:Gltf, textures: WebGLTexture[]) => void;

    public constructor(
        public readonly name,
        public readonly shader: Shader,
        public readonly test: (material: GltfMaterial) => boolean,
        useInternal: (shader: Shader, material: GltfMaterial,gltf:Gltf, textures: WebGLTexture[]) => void
    ) {
        this.use = (material: GltfMaterial,gltf:Gltf, textures: WebGLTexture[]) => {
            shader.useProgram();
            useInternal(shader, material, gltf, textures);
        }
    }
}