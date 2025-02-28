import { resizeCanvasToDisplaySize } from "@/lib/webgl-utils";
import { RefObject } from "react";
import { initShaderProgram } from "./shaders";

const vsSource = `#version 300 es
    in vec2 a_position;
    in vec2 a_texcoord;

    uniform vec2 u_resolution;

    uniform vec2 u_translation;

    out vec2 TexCoord;

    void main() {
      TexCoord = a_texcoord;
          // convert the position from pixels to 0.0 to 1.0
      vec2 position = a_position + u_translation;
      
      vec2 zeroToOne = position / u_resolution;
  
      // convert from 0->1 to 0->2
      vec2 zeroToTwo = zeroToOne * 2.0;
  
      // convert from 0->2 to -1->+1 (clip space)
      vec2 clipSpace = zeroToTwo - 1.0;
  
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
  `;

const fsSource = `#version 300 es
  precision highp float;

  out vec4 outColor;

  in vec2 TexCoord;

  uniform sampler2D ourTexture;

  void main() {
    outColor = texture(ourTexture, TexCoord * vec2(1, -1));
  }
`;

const FLOAT_SIZE = 4;

class Moodboard {
  canvas: HTMLCanvasElement | null;
  gl: WebGL2RenderingContext | null;
  shaderProgram: WebGLProgram | null | undefined;
  vao: WebGLVertexArrayObject | null;
  vbo: WebGLBuffer | null;
  texture: WebGLTexture | null;

  constructor() {
    this.gl = null;
    this.canvas = null;
    this.vao = null;
    this.vbo = null;
    this.texture = null;
    this.shaderProgram = null;

    
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    if (this.canvas === null) {
      return;
    }

    this.gl = this.canvas.getContext("webgl2");
    
    if (this.gl === null) {
      return;
    }
    resizeCanvasToDisplaySize(this.gl.canvas);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  setup() {
    if (this.gl === null) {
      return;
    }
    this.shaderProgram = initShaderProgram(this.gl, vsSource, fsSource);


    console.log("test2");

    // split

    if (this.shaderProgram === null || this.shaderProgram === undefined)
      return;

    if (this.gl === null)
      return;

    const vertices = [
      // position // texture coord
      0, 0,     0, 1,
      500, 0,   1, 1,
      0,  500,  0, 0,
      500, 500, 1, 0 
    ]

    this.vao = this.gl.createVertexArray();
    this.vbo = this.gl.createBuffer();

    let width = 0;
    let height = 0;
    this.texture = this.gl.createTexture();

    console.log(this)
    this.gl.bindVertexArray(this.vao);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

    const vertexPosition = this.gl.getAttribLocation(this.shaderProgram, "a_position");

    this.gl.vertexAttribPointer(vertexPosition, 2, this.gl.FLOAT, false, 4 * FLOAT_SIZE, 0);
    this.gl.enableVertexAttribArray(vertexPosition);

    const texcoordPosition = this.gl.getAttribLocation(this.shaderProgram, "a_texcoord");
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 255, 255]));
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
    

    this.gl.vertexAttribPointer(texcoordPosition, 2, this.gl.FLOAT, false, 4 * FLOAT_SIZE, 2 * FLOAT_SIZE);
    this.gl.enableVertexAttribArray(texcoordPosition);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

    this.gl.bindVertexArray(null);
  }

  onImageLoad(image: HTMLImageElement) {
    
    if (this.gl === null) 
      return;

    this.gl.bindVertexArray(this.vao);
      // Now that the image has loaded make copy it to the texture.
    if (image === null)
      return

    // let tempImage = new Image();
    // tempImage.src = "http://localhost:3000/f-texture.png";
    // tempImage.addEventListener('load', function() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA,this.gl.UNSIGNED_BYTE, image);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
  }

  render() {
    if (this.gl === null) 
      return;

    if (this.shaderProgram === null || this.shaderProgram === undefined)
      return;

    // if (vao === null)
    //   return;

    this.gl.clearColor(0.2, 0.2, 0.2, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

    this.gl.useProgram(this.shaderProgram);

    // this.gl.uniform1i(this.gl.getUniformLocation(shaderProgram, "ourTexture"), texture);

    this.gl.uniform2f(this.gl.getUniformLocation(this.shaderProgram, "u_resolution"), this.gl.canvas.width, this.gl.canvas.height);
    this.gl.uniform2f(this.gl.getUniformLocation(this.shaderProgram, "u_translation"), Math.sin(Date.now()/ 1000) * 400, 0);

    

    this.gl.bindVertexArray(this.vao);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}

export { Moodboard };