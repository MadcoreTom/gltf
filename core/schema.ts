// TODO incomplete

export type XGltf = {
    asset: any,
    scene: number,
    scenes: any[],
    nodes: any[],
    animations: any[],
    materials: any[],
    meshes: XGltfMesh[],
    skins: any[],
    accessors: XGltfAcceesor[],
    bufferViews: XGltfBufferView[],
    buffers: XGltfBufferer[]
}

export type XGltfAcceesor = {
    /**  IDX of bufferViews */
    bufferView: number,
    componentType: 5121 | 5123 | 5126,
    count: number,
    normalized?: boolean,
    type: "VEC4" | "VEC3" | "SCALAR"
}

export type XGltfBufferView = {
    /**  IDX of buffers */
    buffer: number,
    byteLength: number,
    byteOffset: number,
    byteStride?:number,
    target: number
}

export type XGltfBufferer = {
    byteLength: number;
    uri: string
}
export type XGltfMesh = {
    name?: string,
    primitives: XGltfMeshPrimitive[]
}

export type XGltfMeshPrimitive = {
    attributes: { [key: string]: number },
    indices: number,
    material: number
}