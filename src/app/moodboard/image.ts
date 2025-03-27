import { mat3 } from "gl-matrix";
import { Vector2 } from "./types";

const FLOAT_SIZE = 4;

const DEFAULT_IMAGE = new Uint8Array([0, 255, 255, 255]);

class ImageMesh {
  shaderProgram: WebGLProgram
  texture: WebGLTexture | null;
  vertexArrayObject: WebGLVertexArrayObject | null;
  vertexBufferObject: WebGLVertexArrayObject | null;
  objectMatrix = mat3.create();

  constructor(gl: WebGL2RenderingContext, shaderProgram: WebGLProgram, moodboardImage: MoodboardImage, textured: boolean) {
    this.shaderProgram = shaderProgram;
    this.texture = null;
    this.vertexArrayObject = null;
    this.vertexBufferObject = null;

    if (gl === null) 
      return;

    let image : HTMLImageElement | Uint8Array<ArrayBuffer>;

    if (moodboardImage === undefined || moodboardImage === null)
      return;
      
    if (textured === false) {
      console.log("untextured");
      image = DEFAULT_IMAGE;
    } else {
      if (moodboardImage.image === null || moodboardImage.image === undefined)
        return; 
      image = moodboardImage.image;
    }

    const width = moodboardImage.width;
    const height = moodboardImage.height;
    
    this.vertexArrayObject = gl.createVertexArray();
    this.vertexBufferObject = gl.createBuffer();

    this.texture = gl.createTexture();

    gl.bindVertexArray(this.vertexArrayObject);

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
    
    if (image instanceof HTMLImageElement)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    else 
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    

    gl.vertexAttribPointer(texcoordPosition, 2, gl.FLOAT, false, 4 * FLOAT_SIZE, 2 * FLOAT_SIZE);
    gl.enableVertexAttribArray(texcoordPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindVertexArray(null);
  }

  updateObjectMatrix(moodboardImage: MoodboardImage) {
    // calculate object matrix 
    // TODO: don't call every frame pls
    const scaleMatrix = mat3.fromValues(
      moodboardImage.scale.x, 0, 0,
      0, moodboardImage.scale.y, 0,
      0, 0, 1,
    );

    const translationMatrix = mat3.fromValues(
      1, 0, 0,
      0, 1, 0,
      moodboardImage.position.x + (moodboardImage.width / 2), moodboardImage.position.y + (moodboardImage.height / 2), 1,
    );

    const moveOriginMatrix = mat3.fromValues(
      1, 0, 0,
      0, 1, 0,
      -(moodboardImage.width / 2), -(moodboardImage.height / 2), 1,
    );

    // move origin to center


    mat3.multiply(this.objectMatrix, translationMatrix, scaleMatrix);
    mat3.multiply(this.objectMatrix, this.objectMatrix, moveOriginMatrix);
  }

  render(gl: WebGL2RenderingContext, cameraMatrix: mat3, moodboardImage: MoodboardImage, shaderProgram?: WebGLProgram) {
    if (shaderProgram === undefined)
      shaderProgram = this.shaderProgram;

    this.updateObjectMatrix(moodboardImage);
    gl.useProgram(shaderProgram);

    gl.bindVertexArray(this.vertexArrayObject);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.uniform2f(gl.getUniformLocation(shaderProgram, "u_resolution"), gl.canvas.width, gl.canvas.height);
    gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "u_objectMatrix"), false, this.objectMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "u_cameraMatrix"), false, cameraMatrix);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "u_id"), moodboardImage.id);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    
    gl.bindVertexArray(null);
  }
}

class MoodboardImage {
  width: number;
  height: number;
  image: HTMLImageElement | null;
  position: Vector2;
  scale = {x: 1, y: 1};
  id: number;

  mesh: ImageMesh;

  constructor(width: number, height: number, position: Vector2, shaderProgram: WebGLProgram, gl: WebGL2RenderingContext, id: number, image?: HTMLImageElement) {
    this.width = width;
    this.height = height;
    this.position = position;
    this.id = id;
    this.image = null;
    
    let textured = false;
    if (image) {
      this.image = image;
      textured = true;
    }

    console.log(textured);
    
    this.mesh = new ImageMesh(gl, shaderProgram, this, textured);
  }

  move(translation: Vector2) {
    this.position.x += translation.x;
    this.position.y += translation.y;
  }

  setScale(scale: Vector2) {
    this.scale = scale;
  }
  setPosition(position: Vector2) {
    this.position = position;
  }

  render(gl: WebGL2RenderingContext, cameraMatrix: mat3, shaderProgram?: WebGLProgram) {
    this.mesh.render(gl, cameraMatrix, this, shaderProgram);
  }

  unmount() {
    this.image?.remove();
  }
  // renderOutline(gl: WebGL2RenderingContext, cameraMatrix: mat3, shaderProgram: WebGLProgram) {
  //   this.mesh.renderOutline(gl, cameraMatrix, shaderProgram, this);
  // }
}

export {MoodboardImage}