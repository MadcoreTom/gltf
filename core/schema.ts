// TODO incomplete

import { quat2, vec3, vec4 } from "gl-matrix"

export type Gltf = {
    asset: any,
    scene: number,
    scenes: GltfScene[],
    nodes: GltfNode[],
    materials: GltfMaterial[],
    meshes: GltfMesh[],
    skins: any[],
    accessors: GltfAcceesor[],
    bufferViews: GltfBufferView[],
    buffers: GltfBuffer[],
    images: GltfImage[],
    textures: GltfTexture[],
    animations?: GltfAnimation[];
}

export type GltfTexture = {
    sampler: number,
    source: number
}

export type GltfImage = {
    mimeType: string,
    name: string,
    uri: string
}

export type GltfMaterial = {
    name: string,
    doubleSided?: boolean,
    emissiveFactor?: vec3,
    pbrMetallicRoughness?: {
        baseColorFactor?: vec3 | vec4,
        baseColorTexture?: {
            index: number
        },
        roughnessFactor?: number
    }
}

export type GltfAcceesor = { // TODO typo in name
    /**  IDX of bufferViews */
    bufferView: number,
    componentType: 5121 | 5123 | 5126,
    count: number,
    normalized?: boolean,
    type: "VEC4" | "VEC3" | "VEC2" | "SCALAR"
}

export type GltfBufferView = {
    /**  IDX of buffers */
    buffer: number,
    byteLength: number,
    byteOffset: number,
    byteStride?:number,
    target: number
}

export type GltfBuffer = {
    byteLength: number;
    uri: string
}
export type GltfMesh = {
    name?: string,
    primitives: GltfMeshPrimitive[]
}

export type GltfMeshPrimitive = {
    attributes: { [key: string]: number },
    indices: number,
    material: number
}

export type GltfNode = {
    mesh?: number,
    name?: string,
    rotation?: quat2,
    scale?: vec3,
    translation?: vec3,
    children?: number[]
}
export type GltfScene = {
    name?: string,
    nodes: number[]
}

export type GltfAnimation = {
    samplers: GltfAnimationSampler[],
    channels: GltfAnimationChannel[]
}

export type GltfAnimationSampler = {
    input: number, // index of buffer view for times
    output: number, // index of buffer view for values
    interpolation: "LINEAR" // TODO add others
}

export type GltfAnimationChannel = {
    sampler: number, // index of sampler
    target: {
        node: number, // index of .nodes
        path: "rotation" | "scale" | "translation",
    },
    name?: string
}