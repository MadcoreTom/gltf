export class TextureCache {
    private readonly textures: Map<string, WebGLTexture> = new Map();

    constructor(private readonly gl: WebGL2RenderingContext) {

    }
    public loadOrGet(uri: string): WebGLTexture {
        let texture = this.textures.get(uri);
        if (!texture) {
            texture = this.gl.createTexture();
            this.textures.set(uri, texture)
            const img = new Image();
            img.src = uri;
            img.onload = () => this.onload(uri, img, texture as WebGLTexture);
        }
        return texture;
    }

    private onload(uri: string, image: HTMLImageElement, texture: WebGLTexture) {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // 1 is true
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, WebGLRenderingContext.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, WebGLRenderingContext.LINEAR_MIPMAP_LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);
        console.log("Loaded texture", uri);
    }


    // TODO implement a method to unload, or maybe decrement references
}