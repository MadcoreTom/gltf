import { mat4, vec4 } from "gl-matrix";

export class Shader {
    private program: WebGLProgram | null;
    private attrib: { [name: string]: GLuint } = {};
    private uniform: { [name: string]: WebGLUniformLocation } = {};

    constructor(private readonly gl: WebGLRenderingContext, private readonly vert: string, private readonly frag: string) {
        this.gl = gl;
    }
    getLocation(name: "pos" | "norm" | "tex"): GLuint {
        return this.attrib[name];
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
            this.attrib["pos"] = gl.getAttribLocation(program, "aPos");
            this.attrib["norm"] = gl.getAttribLocation(program, "aNorm");
            this.attrib["tex"] = gl.getAttribLocation(program, "aTex");
            this.attrib["joints"] = gl.getAttribLocation(program, "aJoints");
            this.attrib["weights"] = gl.getAttribLocation(program, "aWeights");
            
            console.log("Shader attrib", Object.entries(this.attrib).filter(([v,k])=>k>=0).map(a=>a.join(":")).join(", "))

            this.enableVertexAttribArray("pos");
            this.enableVertexAttribArray("norm");
            this.enableVertexAttribArray("tex");
            this.enableVertexAttribArray("joints");
            this.enableVertexAttribArray("weights");

            // Uniform
            this.uniform["model"] = gl.getUniformLocation(program, "uModelMat") as number;
            this.uniform["projection"] = gl.getUniformLocation(program, "uProjMat") as number;
            this.uniform["col"] = gl.getUniformLocation(program, "uCol") as number;
            for (let i = 0; i < 64; i++)
                this.uniform["joints@" + i] = gl.getUniformLocation(program, "uJoints["+i+"]") as number;
            console.log(this.uniform)

            // gl.uniform1i(this.uTex, 0);  // texture unit 0
            // gl.uniform1i(this.uTex2, 1);  // texture unit 1
            console.log("Compiled", gl.getError())
        }
        return this;
    }

    private enableVertexAttribArray(name:string){
        const loc = this.attrib[name];
        if(loc >=0){
            this.gl.enableVertexAttribArray(loc);
        }
    }

    public setMat4(name: string, m: mat4) {
        this.gl.uniformMatrix4fv(this.uniform[name], false, m);
    }

    public setVec4(name: string, v: vec4) {
        this.gl.uniform4fv(this.uniform[name], v);
    }

    public setMat4s(name: string, m: mat4[]) {
        m.forEach((mat,i)=>{
            this.gl.uniformMatrix4fv(this.uniform[name+"@"+i], false, mat);
        })
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
}

 export async function loadShader(gl: WebGL2RenderingContext, vertUri: string, fragUri: string): Promise<Shader> {
    const vertResponse = await fetch(vertUri);
    const fragResponse = await fetch(fragUri);
    const vertText = await vertResponse.text();
    const fragText = await fragResponse.text();
    return new Shader(gl, vertText, fragText).compile();
}