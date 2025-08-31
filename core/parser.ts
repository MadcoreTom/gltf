import { Gltf } from "./schema";
import { TextureCache } from "./textureCache";
import { GltfWrapper } from "./wrapper";

export async function load(gl: WebGL2RenderingContext, baseUrl: string, path: string, textureCache?: TextureCache, debug: boolean = false): Promise<GltfWrapper> {
    // Load gltf
    const url = join(baseUrl, path);
    debug && console.log("Loading", url);

    const response = await fetch(url);
    const gltf = await response.json() as Gltf;
    debug && console.log("Loaded GLTF", gltf);

    // Create the wrapper
    const wrapper = new GltfWrapper(gl, gltf, baseUrl, textureCache);

    // load binary files
    const promises = gltf.buffers.map(async (buffer, index) => {
        const url = join(baseUrl, buffer.uri);
        const response = await fetch(url);
        const data = await response.arrayBuffer();

        wrapper.addBuffer(data, index);
    });
    await Promise.all(promises);
    debug && console.log("Loaded all buffers");

    // done
    return wrapper;
}

function join(...parts: string[]): string {
    return parts.map(p => p.endsWith("/") ? p = p.substring(0, p.length - 1) : p).join("/");
}