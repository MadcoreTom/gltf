import { Gltf } from "./schema";
import { GltfWrapper } from "./wrapper";

export async function load(gl: WebGL2RenderingContext, baseUrl: string, path: string, debug: boolean= false): Promise<GltfWrapper> {
    // Load gltf
    const url = new URL(path, baseUrl);
    debug && console.log("Loading", url);

    const response = await fetch(url);
    const gltf = await response.json() as Gltf;
    debug && console.log("Loaded GLTF", gltf);

    // Create the wrapper
    const wrapper = new GltfWrapper(gl, gltf);

    // load binary files
    const promises = gltf.buffers.map(async (buffer, index) => {
        const url = new URL(buffer.uri, baseUrl);
        const response = await fetch(url);
        const data = await response.arrayBuffer();

        wrapper.addBuffer(data, index);
    });
    await Promise.all(promises);
    debug && console.log("Loaded all buffers");

    // done
    return wrapper;
}
