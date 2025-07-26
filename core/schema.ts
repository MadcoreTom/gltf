// TODO incomplete

export type Gltf = {
    asset: any,
    scene: number,
    scenes: any[],
    nodes: any[],
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