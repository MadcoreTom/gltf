// TODO incomplete

import { quat, vec3, vec4 } from "gl-matrix"

export type Gltf = {
    asset: any,
    scene: number,
    scenes: GltfScene[],
    nodes: GltfNode[],
    animations: any[],
    materials: any[],
    meshes: GltfMesh[],
    skins: any[],
    accessors: GltfAcceesor[],
    bufferViews: GltfBufferView[],
    buffers: GltfBuffer[]
}

export type GltfAcceesor = {
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
    rotation?: quat,
    scale?: vec3,
    translation?: vec3,
    children?: number[]
}
export type GltfScene = {
    name?: string,
    nodes: number[]
}