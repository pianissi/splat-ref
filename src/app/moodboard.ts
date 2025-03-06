import { resizeCanvasToDisplaySize } from "@/lib/webgl-utils";
import { RefObject } from "react";
import { initShaderProgram } from "./shaders";
import { mat3, vec3 } from "gl-matrix";

const vsSource = `#version 300 es
    layout (location = 0) in vec2 a_position;
    layout (location = 1) in vec2 a_texcoord;

    uniform vec2 u_resolution;

    uniform mat3 u_objectMatrix;
    uniform mat3 u_cameraMatrix;

    out vec2 TexCoord;

    void main() {
      TexCoord = a_texcoord;
          // convert the position from pixels to 0.0 to 1.0
      vec2 position = (u_objectMatrix * vec3(a_position, 1)).xy;

      vec2 cameraSpace = (u_cameraMatrix * vec3(position,1 )).xy;
      
      vec2 zeroToOne = cameraSpace / u_resolution;
  
      // convert from 0->1 to 0->2
      vec2 zeroToTwo = zeroToOne * 2.0;
  
      // convert from 0->2 to -1->+1 (clip space)
      vec2 clipSpace = zeroToTwo - 1.0;

      
  
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
  `;

const fsSource = `#version 300 es
  precision highp float;
  precision mediump int;

  layout (location=0) out vec4 outColor;
  layout (location=1) out int id;

  in vec2 TexCoord;

  uniform sampler2D ourTexture;

  uniform int u_id; 

  void main() {
    outColor = texture(ourTexture, TexCoord * vec2(1, -1));
    id = u_id;
  }
`;

const framebufferVs = `#version 300 es
layout (location = 0) in vec4 a_position;
layout (location = 1) in vec2 a_texcoord;

out vec2 TexCoord;

void main() {
  gl_Position = a_position;
  TexCoord = a_texcoord;
}
`;

const framebufferFs = `#version 300 es
  precision mediump float;

  uniform sampler2D sampler;

  in vec2 TexCoord;

  out vec4 outColor;

  void main() {
    outColor = texture(sampler, TexCoord);
  }
`;

const borderVs = `#version 300 es
  layout (location = 0) in vec2 a_position;

  uniform vec2 u_resolution;
  
  uniform mat3 u_objectMatrix;
  uniform mat3 u_cameraMatrix;

  void main() {
        // convert the position from pixels to 0.0 to 1.0
    vec2 position = (u_objectMatrix * vec3(a_position, 1)).xy;

    vec2 cameraSpace = (u_cameraMatrix * vec3(position,1 )).xy;
    
    vec2 zeroToOne = cameraSpace / u_resolution;

    // convert from 0->1 to 0->2
    vec2 zeroToTwo = zeroToOne * 2.0;

    // convert from 0->2 to -1->+1 (clip space)
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  }
`;

const borderFs = `#version 300 es
  precision highp float;
  precision mediump int;

  layout (location=0) out vec4 outColor;
  layout (location=1) out int id;


  uniform sampler2D ourTexture;

  uniform int u_id; 

  void main() {
    outColor = vec4(1.0, 0.0, 0.0, 1.0);
    id = u_id;
  }
`;


const FLOAT_SIZE = 4;
const RESERVED_ID_NUM = 100;

interface Vector2 {
  x: number;
  y: number;
}

interface Mouse {
  position: Vector2;
  delta: Vector2;
}

// from https://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript
function rand(min: number, max: number) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// TODO : fix this clearly awful code smell
class Gizmo {
  shaderProgram: WebGLProgram
  width: number;
  height: number;
  position: Vector2;
  scale = {x: 1, y: 1};
  texture: WebGLTexture | null;
  vertexArrayObject: WebGLVertexArrayObject | null;
  vertexBufferObject: WebGLVertexArrayObject | null;
  id: number;

  constructor(width: number, height: number, position: Vector2, shaderProgram: WebGLProgram, gl: WebGL2RenderingContext, id: number) {
    this.shaderProgram = shaderProgram;
    this.width = width;
    this.height = height;
    this.position = position;
    this.texture = null;
    this.vertexArrayObject = null;
    this.vertexBufferObject = null;
    this.id = id;

    if (gl === null) 
      return;

    this.vertexArrayObject = gl.createVertexArray();
    this.vertexBufferObject = gl.createBuffer();

    this.texture = gl.createTexture();

    gl.bindVertexArray(this.vertexArrayObject);
      // Now that the image has loaded make copy it to the texture.

    const vertices = 
    [
      0, 0,           0, 1,
      width, 0,       1, 1,
      0, height,      0, 0,
      width, height,  1, 0
    ];

    console.log(this)
    gl.bindVertexArray(this.vertexArrayObject);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const vertexPosition = gl.getAttribLocation(this.shaderProgram, "a_position");

    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 4 * FLOAT_SIZE, 0);
    gl.enableVertexAttribArray(vertexPosition);

    const texcoordPosition = gl.getAttribLocation(this.shaderProgram, "a_texcoord");
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    // TODO: make colour changeable
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 255, 255]));
    gl.generateMipmap(gl.TEXTURE_2D);
    

    gl.vertexAttribPointer(texcoordPosition, 2, gl.FLOAT, false, 4 * FLOAT_SIZE, 2 * FLOAT_SIZE);
    gl.enableVertexAttribArray(texcoordPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindVertexArray(null);
  }

  renderOutline(gl: WebGL2RenderingContext, cameraMatrix: mat3, shader: WebGLShader) {
    if (shader === null || shader === undefined)
      return;
    gl.useProgram(shader);

    // const borderWidth = 0.02 / cameraMatrix[0];
    const borderWidth = 1 / cameraMatrix[0];

    const scaleMatrix = mat3.fromValues(
      1 / cameraMatrix[0], 0, 0,
      0, 1 / cameraMatrix[0], 0,
      0, 0, 1,
    );


    const translationMatrix = mat3.fromValues(
      1, 0, 0,
      0, 1, 0,
      this.position.x, this.position.y, 1,
    );

    const objectMatrix = mat3.create();

    const moveOriginMatrix = mat3.fromValues(
      1, 0, 0,
      0, 1, 0,
      -(this.width / 2), -(this.height / 2), 1,
    );

    // console.log(moveOriginMatrix);
    // move origin to center


    mat3.multiply(objectMatrix, translationMatrix, scaleMatrix);
    mat3.multiply(objectMatrix, objectMatrix, moveOriginMatrix);

    // console.log(translationMatrix);
    // console.log(moveOriginMatrix);

    gl.bindVertexArray(this.vertexArrayObject);

    gl.uniform2f(gl.getUniformLocation(shader, "u_resolution"), gl.canvas.width, gl.canvas.height);
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, "u_objectMatrix"), false, objectMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, "u_cameraMatrix"), false, cameraMatrix);
    gl.uniform1i(gl.getUniformLocation(shader, "u_id"), this.id);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    
    gl.bindVertexArray(null);
  }


  move(translation: Vector2) {
    this.position.x += translation.x;
    this.position.y += translation.y;
  }
}


class MoodboardImage {
  shaderProgram: WebGLProgram
  width: number;
  height: number;
  image: HTMLImageElement | null;
  position: Vector2;
  scale = {x: 1, y: 1};
  texture: WebGLTexture | null;
  vertexArrayObject: WebGLVertexArrayObject | null;
  vertexBufferObject: WebGLVertexArrayObject | null;
  id: number;

  constructor(width: number, height: number, image: HTMLImageElement, position: Vector2, shaderProgram: WebGLProgram, gl: WebGL2RenderingContext, id: number) {
    this.shaderProgram = shaderProgram;
    this.width = width;
    this.height = height;
    this.image = image;
    this.position = position;
    this.texture = null;
    this.vertexArrayObject = null;
    this.vertexBufferObject = null;
    this.id = id;

    if (gl === null) 
      return;

    this.vertexArrayObject = gl.createVertexArray();
    this.vertexBufferObject = gl.createBuffer();

    this.texture = gl.createTexture();

    gl.bindVertexArray(this.vertexArrayObject);
      // Now that the image has loaded make copy it to the texture.
    if (image === null)
      return

    const vertices = 
    [
      0, 0,           0, 1,
      width, 0,       1, 1,
      0, height,      0, 0,
      width, height,  1, 0
    ];

    console.log(this)
    gl.bindVertexArray(this.vertexArrayObject);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const vertexPosition = gl.getAttribLocation(this.shaderProgram, "a_position");

    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 4 * FLOAT_SIZE, 0);
    gl.enableVertexAttribArray(vertexPosition);

    const texcoordPosition = gl.getAttribLocation(this.shaderProgram, "a_texcoord");
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    

    gl.vertexAttribPointer(texcoordPosition, 2, gl.FLOAT, false, 4 * FLOAT_SIZE, 2 * FLOAT_SIZE);
    gl.enableVertexAttribArray(texcoordPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindVertexArray(null);
  }

  render(gl: WebGL2RenderingContext, cameraMatrix: mat3) {
    
    // calculate object matrix 
    // TODO: don't call every frame pls
    const scaleMatrix = mat3.fromValues(
      this.scale.x, 0, 0,
      0, this.scale.y, 0,
      0, 0, 1,
    );


    const translationMatrix = mat3.fromValues(
      1, 0, 0,
      0, 1, 0,
      this.position.x + (this.width / 2), this.position.y + (this.height / 2), 1,
    );

    const objectMatrix = mat3.create();

    const moveOriginMatrix = mat3.fromValues(
      1, 0, 0,
      0, 1, 0,
      -(this.width / 2), -(this.height / 2), 1,
    );

    // move origin to center


    mat3.multiply(objectMatrix, translationMatrix, scaleMatrix);
    mat3.multiply(objectMatrix, objectMatrix, moveOriginMatrix);



    gl.useProgram(this.shaderProgram);

    
    gl.bindVertexArray(this.vertexArrayObject);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.uniform2f(gl.getUniformLocation(this.shaderProgram, "u_resolution"), gl.canvas.width, gl.canvas.height);
    gl.uniformMatrix3fv(gl.getUniformLocation(this.shaderProgram, "u_objectMatrix"), false, objectMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(this.shaderProgram, "u_cameraMatrix"), false, cameraMatrix);
    gl.uniform1i(gl.getUniformLocation(this.shaderProgram, "u_id"), this.id);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    
    gl.bindVertexArray(null);
  }

  renderOutline(gl: WebGL2RenderingContext, cameraMatrix: mat3, shader: WebGLShader) {
    if (shader === null || shader === undefined)
      return;
    gl.useProgram(shader);

    let borderWidthX = 5 / (cameraMatrix[0] * this.width);
    let borderWidthY = 5 / (cameraMatrix[0] * this.height);

    if (this.scale.x < 0)
      borderWidthX *= -1;

    if (this.scale.y < 0)
      borderWidthY *= -1;

    const scaleMatrix = mat3.fromValues(
      this.scale.x + borderWidthX, 0, 0,
      0, this.scale.y + borderWidthY, 0,
      0, 0, 1,
    );


    const translationMatrix = mat3.fromValues(
      1, 0, 0,
      0, 1, 0,
      this.position.x + (this.width / 2), this.position.y + (this.height / 2), 1,
    );

    const objectMatrix = mat3.create();

    const moveOriginMatrix = mat3.fromValues(
      1, 0, 0,
      0, 1, 0,
      -(this.width / 2), -(this.height / 2), 1,
    );

    // console.log(moveOriginMatrix);
    // move origin to center


    mat3.multiply(objectMatrix, translationMatrix, scaleMatrix);
    mat3.multiply(objectMatrix, objectMatrix, moveOriginMatrix);

    // console.log(translationMatrix);
    // console.log(moveOriginMatrix);

    gl.bindVertexArray(this.vertexArrayObject);

    gl.uniform2f(gl.getUniformLocation(shader, "u_resolution"), gl.canvas.width, gl.canvas.height);
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, "u_objectMatrix"), false, objectMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, "u_cameraMatrix"), false, cameraMatrix);
    gl.uniform1i(gl.getUniformLocation(shader, "u_id"), this.id);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    
    gl.bindVertexArray(null);
  }

  move(translation: Vector2) {
    this.position.x += translation.x;
    this.position.y += translation.y;
  }
}

const MIN_ZOOM = 0.000005;

const TOP_LEFT_GIZMO_ID = 2;
const TOP_RIGHT_GIZMO_ID = 3;
const BOTTOM_LEFT_GIZMO_ID = 4;
const BOTTOM_RIGHT_GIZMO_ID = 5;

class Moodboard {
  canvas: HTMLCanvasElement | null;
  gl: WebGL2RenderingContext | null;
  shaderProgram: WebGLProgram | null | undefined;
  vao: WebGLVertexArrayObject | null;
  vbo: WebGLBuffer | null;
  fragColorTexture: WebGLTexture | null;
  idTexture: WebGLTexture | null;
  renderBuffer: WebGLRenderbuffer | null;
  frameBuffer: WebGLFramebuffer | null;
  bufferProgram: WebGLProgram | null | undefined; 
  bufferVao: WebGLVertexArrayObject | null;
  idCount = RESERVED_ID_NUM;

  cameraPosition = {x: 0, y: 0}; 
  cameraScale = {x: 1, y: 1};

  zoomLinear = 1;
  cameraProjectionMatrix = mat3.create();

  mouse : Mouse = {position: {x: 0, y: 0}, delta: {x: 0, y: 0}};

  gizmos : Gizmo[];
  
  mouseDown = false;
  borderShader: WebGLProgram | null | undefined;
  time = performance.now();

  selectedIndex = -1;
  selectedImage = -1;

  images = new Map<number, MoodboardImage>();

  renderOrder: number[];
  

  constructor() {
    this.gl = null;
    this.canvas = null;
    this.vao = null;
    this.vbo = null;
    // this.texture = null;
    this.shaderProgram = null;
    this.renderOrder = [];
    this.fragColorTexture = null;
    this.idTexture = null;
    this.renderBuffer = null;
    this.frameBuffer = null;
    this.borderShader = null;
    this.bufferProgram = null;
    this.bufferVao = null;
    this.gizmos = [];
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    if (this.canvas === null) {
      return;
    }

    // setup mouse listeners

    document.addEventListener('mousedown', (event) => {
      this.mouseDown = true;
      this.mouse.position.x = event.pageX;
      this.mouse.position.y = event.pageY;
      this.mouse.delta = {x: 0, y: 0};

      if (this.gl === null)
        return;

      const data = new Int16Array(1);

      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
      this.gl.readBuffer(this.gl.COLOR_ATTACHMENT1);// This is the attachment we want to read
      this.gl.readPixels(						// This will read the pixels to the buffer asynchronously
        this.mouse.position.x, canvas.height - this.mouse.position.y,1,1,
        this.gl.getParameter(this.gl.IMPLEMENTATION_COLOR_READ_FORMAT),
        this.gl.getParameter(this.gl.IMPLEMENTATION_COLOR_READ_TYPE),
        data
      );
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

      console.log(data[0]);
      this.selectedIndex = data[0];

      if (this.selectedIndex === -1) {
        this.selectedImage = this.selectedIndex;
        return;
      }
      // move in render order
      console.log(this.renderOrder);
      
      if (this.selectedIndex < RESERVED_ID_NUM)
        return;

      // set image!
      this.selectedImage = this.selectedIndex;

      this.renderOrder.splice(this.renderOrder.findIndex(index => index === this.selectedIndex), 1);
      this.renderOrder.push(this.selectedIndex);


    });
    document.addEventListener('mousemove', (event) => {
      
      this.mouse.delta = {x: event.pageX - this.mouse.position.x, y: event.pageY - this.mouse.position.y};
      this.mouse.position.x = event.pageX;
      this.mouse.position.y = event.pageY;
      
      if (!this.mouseDown) 
        return;

      this.mouse.delta.x /= this.cameraScale.x;
      this.mouse.delta.y /= this.cameraScale.y;
      if (this.selectedIndex !== -1) {
        // check if is an actual image

        const image = this.images.get(this.selectedImage)
        if (image === undefined)
          return;

        // let's do gizmos
        if (this.selectedIndex === TOP_LEFT_GIZMO_ID) {
          
          if (this.gl == null) {
            return;
          }
          let scaleMatrix = mat3.fromValues(
            image.scale.x, 0, 0,
            0, image.scale.y, 0,
            0, 0, 1,
          );
      
      
          const translationMatrix = mat3.fromValues(
            1, 0, 0,
            0, 1, 0,
            image.position.x + (image.width / 2), image.position.y + (image.height / 2), 1,
          );
      
          const objectMatrix = mat3.create();
      
          const moveOriginMatrix = mat3.fromValues(
            1, 0, 0,
            0, 1, 0,
            -(image.width / 2), -(image.height / 2), 1,
          );
      
          // move origin to center
      
      
          mat3.multiply(objectMatrix, translationMatrix, scaleMatrix);
          mat3.multiply(objectMatrix, objectMatrix, moveOriginMatrix);
          
          const preZoom = vec3.create();
          const topLeft = vec3.create();

          vec3.transformMat3(preZoom, vec3.fromValues(image.width, image.height, 1), objectMatrix);
          // vec3.transformMat3(topLeft, vec3.fromValues(0, 0, 1), objectMatrix);

          // if gizmo, we need to move position to match

          // transform mouse position to world position

          // todo fix for rectangular images
          const mouseWorldPos = vec3.create();
          mouseWorldPos[0] = (this.mouse.position.x / this.cameraScale.x - this.cameraPosition.x);
          mouseWorldPos[1] = (this.mouse.position.y / this.cameraScale.y - this.cameraPosition.y);

          // find new width
          const newWidth = preZoom[0] - mouseWorldPos[0];
          const curWidth = image.width;
          
          // console.log("%f, %f, %f", curWidth, newWidth, newScale);
          const newHeight = (preZoom[1] - mouseWorldPos[1]);
          const curHeight = image.height;
          // const newScale = newHeight / image.height;
          const newScale = ((newWidth / image.width) + (newHeight / image.height))/2;
          // const newScale = (newWidth + newHeight)/ (image.width + image.height);

          // change the scale to match
          image.scale.x = newScale;
          image.scale.y = image.scale.x;

          // bottom right
          console.log("%f, %f", newHeight, mouseWorldPos[1]);
          

          scaleMatrix = mat3.fromValues(
            image.scale.x, 0, 0,
            0, image.scale.y, 0,
            0, 0, 1,
          );

          const postZoom = vec3.create();
          
          mat3.multiply(objectMatrix, translationMatrix, scaleMatrix);
          mat3.multiply(objectMatrix, objectMatrix, moveOriginMatrix);
          

          vec3.transformMat3(postZoom, vec3.fromValues(image.width, image.height, 1), objectMatrix);

          image.position.x += -postZoom[0] + preZoom[0];
          image.position.y += -postZoom[1] + preZoom[1];
        } else {
          
          image.move(this.mouse.delta);
        }
      }
      if (this.selectedIndex === -1) {
        this.cameraPosition.x += this.mouse.delta.x;
        this.cameraPosition.y += this.mouse.delta.y;
      }
      
      
      
    });
    document.addEventListener('mouseup', () => this.mouseDown = false);
    document.addEventListener('wheel', (event) => {
      // let cameraScaleMatrix = mat3.fromValues(
      //   this.cameraScale.x, 0, 0,
      //   0, this.cameraScale.y, 0,
      //   0, 0, 1,
      // );

      // let cameraTranslationMatrix = mat3.fromValues(
      //   1, 0, 0,
      //   0, 1, 0,
      //   this.cameraPosition.x, this.cameraPosition.y, 0,
      // );
  
      // mat3.multiply(this.cameraProjectionMatrix, cameraScaleMatrix, cameraTranslationMatrix);
      if (this.gl === null)
        return;

      const preZoom = vec3.create();
      
      
      // convert to world coords

      preZoom[0] = (this.mouse.position.x / this.cameraScale.x - this.cameraPosition.x);
      preZoom[1] = (this.mouse.position.y / this.cameraScale.y - this.cameraPosition.y);

      // const invertedCameraProjectionMatrix = mat3.create();
      // mat3.invert(invertedCameraProjectionMatrix, this.cameraProjectionMatrix);

      // console.log(invertedCameraProjectionMatrix);
      // console.log(this.cameraProjectionMatrix);
      // vec3.transformMat3(preZoom, vec3.fromValues(this.mouse.position.x, this.mouse.position.y, 1), this.cameraProjectionMatrix);

      this.zoomLinear += event.deltaY * -0.015;
      
      this.cameraScale.x = Math.exp(this.zoomLinear * 0.1);

      this.cameraScale.y = this.cameraScale.x;

      const postZoom = vec3.create();
      
      // mat3.invert(invertedCameraProjectionMatrix, this.cameraProjectionMatrix);
      // vec3.transformMat3(postZoom, vec3.fromValues(this.mouse.position.x, this.mouse.position.y, 1), this.cameraProjectionMatrix);
      // console.log(preZoom);
      // console.log(postZoom);

      postZoom[0] = (this.mouse.position.x / this.cameraScale.x - this.cameraPosition.x);
      postZoom[1] = (this.mouse.position.y / this.cameraScale.y - this.cameraPosition.y);

      this.cameraPosition.x += postZoom[0] - preZoom[0];
      this.cameraPosition.y += postZoom[1] - preZoom[1];
      

      // this.cameraScale.x = this.cameraScale.y;
    });
    

    this.gl = this.canvas.getContext("webgl2");
    
    if (this.gl === null) {
      return;
    }
    resizeCanvasToDisplaySize(this.gl.canvas);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    this.gl.clearColor(0.8, 0.8, 0.8, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.setupRenderBuffer();
    // this.setFramebufferAttachmentSizes(this.gl.canvas.width, this.gl.canvas.height)
  }

  setup() {
    if (this.gl === null) {
      return;
    }
    this.shaderProgram = initShaderProgram(this.gl, vsSource, fsSource);
    
    this.borderShader = initShaderProgram(this.gl, borderVs, borderFs);


    
    console.log("test2");

    // split

    if (this.shaderProgram === null || this.shaderProgram === undefined)
      return;

    this.gizmos.push(new Gizmo(20, 20, {x: 0, y: 0}, this.shaderProgram, this.gl, TOP_LEFT_GIZMO_ID));
    this.gizmos.push(new Gizmo(20, 20, {x: 0, y: 0}, this.shaderProgram, this.gl, TOP_RIGHT_GIZMO_ID));
    this.gizmos.push(new Gizmo(20, 20, {x: 0, y: 0}, this.shaderProgram, this.gl, BOTTOM_LEFT_GIZMO_ID));
    this.gizmos.push(new Gizmo(20, 20, {x: 0, y: 0}, this.shaderProgram, this.gl, BOTTOM_RIGHT_GIZMO_ID));
  }

  setupRenderBuffer() {
    if (this.gl === null) {
      return;
    }



    this.bufferProgram = initShaderProgram(this.gl, framebufferVs, framebufferFs);

    const quadData = new Float32Array([
      // Pos (xy)         // UV coordinate
      -1,1,               0,1,
      -1,-1,              0,0,
      1,1,                1,1,
      1,-1,               1,0,
    ]);
    
    this.bufferVao = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.bufferVao);
    
    const quadBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, quadBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, quadData, this.gl.STATIC_DRAW);
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 16, 0);
    this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, 16, 8);
    this.gl.enableVertexAttribArray(0);
    this.gl.enableVertexAttribArray(1);
    
    this.gl.bindVertexArray(null);

    this.fragColorTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.fragColorTexture);
    this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.RGBA8, this.gl.canvas.width, this.gl.canvas.height);

    this.idTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.idTexture);
    this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.R16I, this.gl.canvas.width, this.gl.canvas.height);
    // Create a texture to render to
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    this.renderBuffer = this.gl.createRenderbuffer();
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.renderBuffer);
    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);

    this.frameBuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.fragColorTexture, 0);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT1, this.gl.TEXTURE_2D, this.idTexture, 0);
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.renderBuffer);

    this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0, this.gl.COLOR_ATTACHMENT1]);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  onImageLoad(image: HTMLImageElement) {
    
    if (this.gl === null) 
      return;

    if (image === null)
      return

    if (this.shaderProgram === null || this.shaderProgram === undefined)
      return

    
    // for (let i = 0; i < 3; i++) {
    const newImage = new MoodboardImage(image.width, image.height, image, {x: rand(0, 1), y: rand(0, 1)}, this.shaderProgram, this.gl, this.idCount);
    this.images.set(this.idCount, newImage);
    this.renderOrder.push(newImage.id);

    this.idCount += 1;
    console.log("image loaded");
    // }

  }

  render() {

    if (this.gl === null) 
      return;

    if (this.shaderProgram === null || this.shaderProgram === undefined)
      return;

    if (this.bufferProgram === null || this.bufferProgram === undefined)
      return;

    if (this.borderShader === null || this.borderShader === undefined)
      return;



    // console.log(this.cameraScale);
    // console.log(this.zoomLinear);
    const cameraScaleMatrix = mat3.fromValues(
      this.cameraScale.x, 0, 0,
      0, this.cameraScale.y, 0,
      0, 0, 1,
    );


    const cameraTranslationMatrix = mat3.fromValues(
      1, 0, 0,
      0, 1, 0,
      this.cameraPosition.x, this.cameraPosition.y, 1,
    );

    mat3.multiply(this.cameraProjectionMatrix, cameraScaleMatrix, cameraTranslationMatrix);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);

    this.gl.clearColor(0.8, 0.8, 0.8, 1.0);

    this.gl.clearBufferfv(this.gl.COLOR, 0, new Float32Array([ 0.8, 0.8, 0.8, 1.0 ]));
    this.gl.clearBufferiv(this.gl.COLOR, 1, new Int16Array([ -1,-1,-1,-1 ]));
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    for (const imageId of this.renderOrder) {
      const image = this.images.get(imageId);
      if (image !== undefined) {
        // console.log("true");
        if (this.selectedImage === imageId) {
          image.renderOutline(this.gl, this.cameraProjectionMatrix, this.borderShader);
          // TODO: don't use this hardcoded magic id
          
          image.render(this.gl, this.cameraProjectionMatrix);

          // gizmo time
          const scaleMatrix = mat3.fromValues(
            image.scale.x, 0, 0,
            0, image.scale.y, 0,
            0, 0, 1,
          );
      
      
          const translationMatrix = mat3.fromValues(
            1, 0, 0,
            0, 1, 0,
            image.position.x + (image.width / 2), image.position.y + (image.height / 2), 1,
          );
      
          const objectMatrix = mat3.create();
      
          const moveOriginMatrix = mat3.fromValues(
            1, 0, 0,
            0, 1, 0,
            -(image.width / 2), -(image.height / 2), 1,
          );
      
          // move origin to center
      
      
          mat3.multiply(objectMatrix, translationMatrix, scaleMatrix);
          mat3.multiply(objectMatrix, objectMatrix, moveOriginMatrix);

          for (const gizmo of this.gizmos) {
            const gizmoPos = vec3.fromValues(0, 0, 1)
            if (gizmo.id === TOP_LEFT_GIZMO_ID) {
              
              vec3.transformMat3(gizmoPos, vec3.fromValues(0, 0, 1), objectMatrix);
              gizmo.position.x = gizmoPos[0];
              gizmo.position.y = gizmoPos[1];
            }
            else if (gizmo.id === TOP_RIGHT_GIZMO_ID) {
              vec3.transformMat3(gizmoPos, vec3.fromValues(image.width, 0, 1), objectMatrix);
              gizmo.position.x = gizmoPos[0];
              gizmo.position.y = gizmoPos[1];
            }
            else if (gizmo.id === BOTTOM_LEFT_GIZMO_ID) {
              vec3.transformMat3(gizmoPos, vec3.fromValues(0, image.height, 1), objectMatrix);
              gizmo.position.x = gizmoPos[0];
              gizmo.position.y = gizmoPos[1];
            }
            else if (gizmo.id === BOTTOM_RIGHT_GIZMO_ID) {
              vec3.transformMat3(gizmoPos, vec3.fromValues(image.width, image.height, 1), objectMatrix);
              gizmo.position.x = gizmoPos[0];
              gizmo.position.y = gizmoPos[1];
            }
            
            gizmo.position.x = gizmoPos[0];
            gizmo.position.y = gizmoPos[1];

            gizmo.renderOutline(this.gl, this.cameraProjectionMatrix, this.borderShader);
            
          }
          // let's render our gizmos!

        } else {
          
          image.render(this.gl, this.cameraProjectionMatrix);
        }
          
        
      }
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    this.gl.useProgram(this.bufferProgram);
    this.gl.bindVertexArray(this.bufferVao);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.fragColorTexture);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindVertexArray(null);

    const currentTime = performance.now();
    const deltaTime = currentTime - this.time;

    this.time = currentTime;
    // console.log("fps: %f", 1000/ deltaTime);
  }
}

export { Moodboard };