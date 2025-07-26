
const COMPONENT_TYPE_MAP: { [id: number]: { constructor: any, glType: number } } = {
    5120: { constructor: Int8Array, glType: WebGL2RenderingContext.BYTE },
    5121: { constructor: Uint8Array, glType: WebGL2RenderingContext.UNSIGNED_BYTE },
    5122: { constructor: Int16Array, glType: WebGL2RenderingContext.SHORT },
    5123: { constructor: Uint16Array, glType: WebGL2RenderingContext.UNSIGNED_SHORT },
    5125: { constructor: Uint32Array, glType: WebGL2RenderingContext.UNSIGNED_INT }, // unsure of gl type
    5126: { constructor: Float32Array, glType: WebGL2RenderingContext.FLOAT },
}

export function createArrayBufferForComponentType(componentType: number, data: ArrayBuffer): ArrayBufferLike {
    const type = COMPONENT_TYPE_MAP[componentType];
    return type.constructor ? new type.constructor(data) : new Float32Array(data);
}

// TODO lots of redundant bits her

export function getGlTypeForComponentType(componentType: number): number {
    const type = COMPONENT_TYPE_MAP[componentType];
    return type.glType ? type.glType : -1;
    // TODO this hack worked
//    return  COMPONENT_TYPE_MAP[componentType] &&  COMPONENT_TYPE_MAP[componentType].constructor == Uint16Array ? WebGL2RenderingContext.UNSIGNED_SHORT : WebGL2RenderingContext.UNSIGNED_INT

}