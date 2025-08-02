import { mat4, ReadonlyMat4, vec4 } from "gl-matrix";

export class Shader {
    private program: WebGLProgram | null;
    private attrib: { [name: string]: GLuint } = {};
    private uniform: { [name: string]: WebGLUniformLocation } = {};

    private worldLoc: WebGLUniformLocation;
    private cameraLoc: WebGLUniformLocation;

    constructor(private readonly gl: WebGLRenderingContext,
        private readonly vert: string,
        private readonly frag: string,
        private readonly worldName: string,
        private readonly cameraName: string,
        private readonly attributeNamePairs: [string, string][]) {
        this.gl = gl;
    }

    compile(): Shader {
        var gl = this.gl;
        var v = this.compileShader(this.vert, gl.VERTEX_SHADER);
        var f = this.compileShader(this.frag, gl.FRAGMENT_SHADER);
        this.program = gl.createProgram();
        if (this.program != null) {
            const program = this.program;
            gl.attachShader(program, v);
            gl.attachShader(program, f);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.log("Shader linking failed", gl.getProgramInfoLog(program));
            }

            this.useProgram();

            // Attributes
            this.attributeNamePairs.forEach(([varName, attribName]) => {
                this.attrib[attribName] = gl.getAttribLocation(program, varName);
            });

            // Uniform
            this.uniform["col"] = gl.getUniformLocation(program, "uCol") as number;
            for (let i = 0; i < 64; i++)
                this.uniform["joints@" + i] = gl.getUniformLocation(program, "uJoints[" + i + "]") as number;
            console.log(this.uniform);

            this.worldLoc = gl.getUniformLocation(program, this.worldName) as WebGLUniformLocation;
            this.cameraLoc = gl.getUniformLocation(program, this.cameraName) as WebGLUniformLocation;

            console.log("Compiled", gl.getError())
        }
        return this;
    }

    public setMat4(name: string, m: mat4) {
        this.gl.uniformMatrix4fv(this.uniform[name], false, m);
    }

    public setVec4(name: string, v: vec4) {
        if (v.length >= 4) {
            this.gl.uniform4fv(this.uniform[name], v);
        } else if (v.length == 3) {
            // in case alpha is missing
            this.gl.uniform4fv(this.uniform[name], [...v, 1.0]);
        }
    }

    public setMat4s(name: string, m: mat4[]) {
        m.forEach((mat, i) => {
            this.gl.uniformMatrix4fv(this.uniform[name + "@" + i], false, mat);
        })
    }

    public setWorld(world: ReadonlyMat4) {
        this.gl.uniformMatrix4fv(this.worldLoc, false, world);
    }
    public setCamera(camera: ReadonlyMat4) {
        this.gl.uniformMatrix4fv(this.cameraLoc, false, camera);
    }

    private compileShader(txt: string, type): WebGLShader {
        var gl = this.gl;
        var sh = <WebGLShader>gl.createShader(type);
        this.gl.shaderSource(sh, txt);
        this.gl.compileShader(sh);
        if (!this.gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.log("Shader compilation failed. Type: " + type, gl.getShaderInfoLog(sh));
        }
        return sh;
    }
    useProgram(): Shader {
        this.gl.useProgram(this.program);
        return this;
    }

    public forEachAttribute(callback: (name: string, loc: number) => void) {
        Object.entries(this.attrib).forEach(([name, loc]) => callback(name, loc));
    }

    public getSupportedAttributes(): readonly string[] {
        return Object.keys(this.attrib);
    }
}

type AttributeName = "POSITION" | "NORMAL" | "TEXCOORD_0";

export class ShaderBuilder {
    private vertText: Promise<string>;
    private fragText: Promise<string>;
    private worldUniformName: string = "worldMat";
    private cameraUniformName: string = "cameraMat";
    private attributeNameMap: { [varName: string]: string } = {};

    public constructor(private readonly gl: WebGL2RenderingContext) {

    }

    public vert(uri: string): ShaderBuilder {
        this.vertText = (async () => {
            const response = await fetch(uri);
            return await response.text();
        })();
        return this;
    }

    public frag(uri: string): ShaderBuilder {
        this.fragText = (async () => {
            const response = await fetch(uri);
            return await response.text();
        })();
        return this;
    }

    public worldMat(name: string): ShaderBuilder {
        this.worldUniformName = name;
        return this;
    }

    public cameraMat(name: string): ShaderBuilder {
        this.cameraUniformName = name;
        return this;
    }

    public attribute(varName: string, attributeName: AttributeName): ShaderBuilder {
        this.attributeNameMap[varName] = attributeName;
        return this;
    }

    public async build(): Promise<Shader> {
        const v = await this.vertText;
        const f = await this.fragText;
        return new Shader(this.gl, v, f, this.worldUniformName, this.cameraUniformName, Object.entries(this.attributeNameMap)).compile();
    }
}