import { resizeCanvasToDisplaySize } from "@/lib/webgl-utils";
import { borderFs, borderVs, defaultFs, defaultVs, framebufferFs, framebufferVs, initShaderProgram } from "./shaders";
import { mat3, vec3 } from "gl-matrix";
import { Mouse, Vector2 } from "./types";
import { Gizmo, MoodboardImage } from "./image";

const RESERVED_ID_NUM = 100;

// from https://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript
function rand(min: number, max: number) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const TOP_LEFT_GIZMO_ID = 2;
const TOP_RIGHT_GIZMO_ID = 3;
const BOTTOM_LEFT_GIZMO_ID = 4;
const BOTTOM_RIGHT_GIZMO_ID = 5;

const GIZMO_SIZE = 20;

class Moodboard {
  canvas: HTMLCanvasElement | null;
  gl: WebGL2RenderingContext | null;

  idCount = RESERVED_ID_NUM;

  cameraPosition = {x: 0, y: 0}; 
  cameraScale = {x: 1, y: 1};
  zoomLinear = 1;
  cameraProjectionMatrix = mat3.create();

  selectedIndex = -1;
  selectedImage = -1;

  renderComponent = new MoodboardRenderComponent();
  inputComponent = new MoodboardInputComponent();

  shaderPrograms = new Map<string, WebGLProgram>();

  images = new Map<number, MoodboardImage>();
  gizmos : MoodboardImage[];

  renderOrder: number[];
  

  constructor() {
    this.renderOrder = [];
    this.gizmos = [];
    this.gl = null;
    this.canvas = null;
  }

  setup(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    if (this.canvas === null)
      return;

    this.gl = this.canvas.getContext("webgl2");
    
    if (this.gl === null)
      return;

    let shaderProgram = initShaderProgram(this.gl, borderVs, borderFs);
    if (shaderProgram === null || shaderProgram === undefined)
      return;

    this.shaderPrograms.set("border", shaderProgram);

    shaderProgram = initShaderProgram(this.gl, defaultVs, defaultFs);
    if (shaderProgram === null || shaderProgram === undefined)
      return;

    this.shaderPrograms.set("default", shaderProgram);
    

    this.gizmos.push(new MoodboardImage(GIZMO_SIZE, GIZMO_SIZE, {x: 0, y: 0}, shaderProgram, this.gl, TOP_LEFT_GIZMO_ID));
    this.gizmos.push(new MoodboardImage(GIZMO_SIZE, GIZMO_SIZE, {x: 0, y: 0}, shaderProgram, this.gl, TOP_RIGHT_GIZMO_ID));
    this.gizmos.push(new MoodboardImage(GIZMO_SIZE, GIZMO_SIZE, {x: 0, y: 0}, shaderProgram, this.gl, BOTTOM_LEFT_GIZMO_ID));
    this.gizmos.push(new MoodboardImage(GIZMO_SIZE, GIZMO_SIZE, {x: 0, y: 0}, shaderProgram, this.gl, BOTTOM_RIGHT_GIZMO_ID));

    this.renderComponent.setup(this);
    this.inputComponent.setup(this);
  }

  onImageLoad(image: HTMLImageElement) {
    
    if (this.gl === null) 
      return;

    if (image === null)
      return;
    
    const shaderProgram = this.shaderPrograms.get("default");
    if (shaderProgram === undefined)
      return

    const newImage = new MoodboardImage(image.width, image.height, {x: rand(0, 1), y: rand(0, 1)}, shaderProgram, this.gl, this.idCount, image);
    this.images.set(this.idCount, newImage);
    this.renderOrder.push(newImage.id);

    this.idCount += 1;
    console.log("image loaded");
  }

  process() {
    // console.log("processing");
    this.renderComponent.process(this);
  }
}

class MoodboardRenderComponent {
  fragColorTexture: WebGLTexture | null;
  idTexture: WebGLTexture | null;
  renderBuffer: WebGLRenderbuffer | null;
  frameBuffer: WebGLFramebuffer | null;
  bufferProgram: WebGLProgram | null | undefined; 
  bufferVao: WebGLVertexArrayObject | null;
  constructor() {
    this.fragColorTexture = null;
    this.idTexture = null;
    this.renderBuffer = null;
    this.frameBuffer = null;
    this.bufferProgram = null;
    this.bufferVao = null;
  }

  setup(moodboard: Moodboard) {
    if (moodboard.gl === null || moodboard.gl === undefined)
      return;
    
    resizeCanvasToDisplaySize(moodboard.gl.canvas);
    moodboard.gl.viewport(0, 0, moodboard.gl.canvas.width, moodboard.gl.canvas.height);

    moodboard.gl.clearColor(0.8, 0.8, 0.8, 1.0);
    moodboard.gl.clear(moodboard.gl.COLOR_BUFFER_BIT);

    this.setupRenderBuffer(moodboard);
  }

  setupRenderBuffer(moodboard: Moodboard) {
    if (moodboard.gl === null) {
      return;
    }

    this.bufferProgram = initShaderProgram(moodboard.gl, framebufferVs, framebufferFs);

    const quadData = new Float32Array([
      // Pos (xy)         // UV coordinate
      -1,1,               0,1,
      -1,-1,              0,0,
      1,1,                1,1,
      1,-1,               1,0,
    ]);
    
    this.bufferVao = moodboard.gl.createVertexArray();
    moodboard.gl.bindVertexArray(this.bufferVao);
    
    const quadBuffer = moodboard.gl.createBuffer();
    moodboard.gl.bindBuffer(moodboard.gl.ARRAY_BUFFER, quadBuffer);
    moodboard.gl.bufferData(moodboard.gl.ARRAY_BUFFER, quadData, moodboard.gl.STATIC_DRAW);
    moodboard.gl.vertexAttribPointer(0, 2, moodboard.gl.FLOAT, false, 16, 0);
    moodboard.gl.vertexAttribPointer(1, 2, moodboard.gl.FLOAT, false, 16, 8);
    moodboard.gl.enableVertexAttribArray(0);
    moodboard.gl.enableVertexAttribArray(1);
    
    moodboard.gl.bindVertexArray(null);

    this.fragColorTexture = moodboard.gl.createTexture();
    moodboard.gl.bindTexture(moodboard.gl.TEXTURE_2D, this.fragColorTexture);
    moodboard.gl.texStorage2D(moodboard.gl.TEXTURE_2D, 1, moodboard.gl.RGBA8, moodboard.gl.canvas.width, moodboard.gl.canvas.height);

    this.idTexture = moodboard.gl.createTexture();
    moodboard.gl.bindTexture(moodboard.gl.TEXTURE_2D, this.idTexture);
    moodboard.gl.texStorage2D(moodboard.gl.TEXTURE_2D, 1, moodboard.gl.R16I, moodboard.gl.canvas.width, moodboard.gl.canvas.height);
    // Create a texture to render to
    moodboard.gl.bindTexture(moodboard.gl.TEXTURE_2D, null);

    this.renderBuffer = moodboard.gl.createRenderbuffer();
    moodboard.gl.bindRenderbuffer(moodboard.gl.RENDERBUFFER, this.renderBuffer);
    moodboard.gl.renderbufferStorage(moodboard.gl.RENDERBUFFER, moodboard.gl.DEPTH_COMPONENT16, moodboard.gl.canvas.width, moodboard.gl.canvas.height);
    moodboard.gl.bindRenderbuffer(moodboard.gl.RENDERBUFFER, null);

    this.frameBuffer = moodboard.gl.createFramebuffer();
    moodboard.gl.bindFramebuffer(moodboard.gl.FRAMEBUFFER, this.frameBuffer);
    moodboard.gl.framebufferTexture2D(moodboard.gl.FRAMEBUFFER, moodboard.gl.COLOR_ATTACHMENT0, moodboard.gl.TEXTURE_2D, this.fragColorTexture, 0);
    moodboard.gl.framebufferTexture2D(moodboard.gl.FRAMEBUFFER, moodboard.gl.COLOR_ATTACHMENT1, moodboard.gl.TEXTURE_2D, this.idTexture, 0);
    moodboard.gl.framebufferRenderbuffer(moodboard.gl.FRAMEBUFFER, moodboard.gl.DEPTH_ATTACHMENT, moodboard.gl.RENDERBUFFER, this.renderBuffer);

    moodboard.gl.drawBuffers([moodboard.gl.COLOR_ATTACHMENT0, moodboard.gl.COLOR_ATTACHMENT1]);

    moodboard.gl.bindFramebuffer(moodboard.gl.FRAMEBUFFER, null);
  }

  resize(moodboard: Moodboard) {
    if (moodboard.gl === null)
      return;

    resizeCanvasToDisplaySize(moodboard.gl.canvas);
    moodboard.gl.viewport(0, 0, moodboard.gl.canvas.width, moodboard.gl.canvas.height);

    moodboard.gl.clearColor(0.8, 0.8, 0.8, 1.0);
    moodboard.gl.clear(moodboard.gl.COLOR_BUFFER_BIT);

    moodboard.gl.bindTexture(moodboard.gl.TEXTURE_2D, this.fragColorTexture);
    moodboard.gl.texStorage2D(moodboard.gl.TEXTURE_2D, 1, moodboard.gl.RGBA8, moodboard.gl.canvas.width, moodboard.gl.canvas.height);

    moodboard.gl.bindTexture(moodboard.gl.TEXTURE_2D, this.idTexture);
    moodboard.gl.texStorage2D(moodboard.gl.TEXTURE_2D, 1, moodboard.gl.R16I, moodboard.gl.canvas.width, moodboard.gl.canvas.height);
    // Create a texture to render to
    moodboard.gl.bindTexture(moodboard.gl.TEXTURE_2D, null);

    moodboard.gl.bindRenderbuffer(moodboard.gl.RENDERBUFFER, this.renderBuffer);
    moodboard.gl.renderbufferStorage(moodboard.gl.RENDERBUFFER, moodboard.gl.DEPTH_COMPONENT16, moodboard.gl.canvas.width, moodboard.gl.canvas.height);
    moodboard.gl.bindRenderbuffer(moodboard.gl.RENDERBUFFER, null);
  }

  pickAt(moodboard: Moodboard, position: Vector2) {
    if (moodboard.gl === null || moodboard.canvas === null)
      return;

    const data = new Int16Array(1);

    moodboard.gl.bindFramebuffer(moodboard.gl.FRAMEBUFFER, this.frameBuffer);
    moodboard.gl.readBuffer(moodboard.gl.COLOR_ATTACHMENT1);// This is the attachment we want to read
    moodboard.gl.readPixels(						// This will read the pixels to the buffer asynchronously
      position.x, moodboard.canvas.height - position.y,1,1,
      moodboard.gl.getParameter(moodboard.gl.IMPLEMENTATION_COLOR_READ_FORMAT),
      moodboard.gl.getParameter(moodboard.gl.IMPLEMENTATION_COLOR_READ_TYPE),
      data
    );
    moodboard.gl.bindFramebuffer(moodboard.gl.FRAMEBUFFER, null);

    console.log(data[0]);
    moodboard.selectedIndex = data[0];
  }

  process(moodboard: Moodboard) {

    if (moodboard.gl === null) 
      return;

    if (this.bufferProgram === null || this.bufferProgram === undefined)
      return;

    this.resize(moodboard);

    const borderShader = moodboard.shaderPrograms.get("border")
    if (borderShader === null || borderShader === undefined)
      return;

    const cameraScaleMatrix = mat3.fromValues(
      moodboard.cameraScale.x, 0, 0,
      0, moodboard.cameraScale.y, 0,
      0, 0, 1,
    );


    const cameraTranslationMatrix = mat3.fromValues(
      1, 0, 0,
      0, 1, 0,
      moodboard.cameraPosition.x, moodboard.cameraPosition.y, 1,
    );

    mat3.multiply(moodboard.cameraProjectionMatrix, cameraScaleMatrix, cameraTranslationMatrix);

    moodboard.gl.bindFramebuffer(moodboard.gl.FRAMEBUFFER, this.frameBuffer);

    moodboard.gl.clearColor(0.8, 0.8, 0.8, 1.0);

    moodboard.gl.clearBufferfv(moodboard.gl.COLOR, 0, new Float32Array([ 0.8, 0.8, 0.8, 1.0 ]));
    moodboard.gl.clearBufferiv(moodboard.gl.COLOR, 1, new Int16Array([ -1,-1,-1,-1 ]));
    moodboard.gl.clear(moodboard.gl.COLOR_BUFFER_BIT | moodboard.gl.DEPTH_BUFFER_BIT);

    for (const imageId of moodboard.renderOrder) {
      const image = moodboard.images.get(imageId);
      if (image !== undefined) {
        // console.log("true");
        if (moodboard.selectedImage === imageId) {
          // scale then unscale

          let borderWidthX = 5 / (moodboard.cameraProjectionMatrix[0] * image.width);
          let borderWidthY = 5 / (moodboard.cameraProjectionMatrix[0] * image.height);

          if (image.scale.x < 0)
            borderWidthX *= -1;

          if (image.scale.y < 0)
            borderWidthY *= -1;

          image.scale.x += borderWidthX;
          image.scale.y += borderWidthY;

          image.render(moodboard.gl, moodboard.cameraProjectionMatrix, borderShader);

          image.scale.x -= borderWidthX;
          image.scale.y -= borderWidthY;
          
          image.render(moodboard.gl, moodboard.cameraProjectionMatrix);

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

          for (const gizmo of moodboard.gizmos) {
            const gizmoPos = vec3.fromValues(0, 0, 1)
            if (gizmo.id === TOP_LEFT_GIZMO_ID) {
              vec3.transformMat3(gizmoPos, vec3.fromValues(0, 0, 1), objectMatrix);
            }
            else if (gizmo.id === TOP_RIGHT_GIZMO_ID) {
              vec3.transformMat3(gizmoPos, vec3.fromValues(image.width, 0, 1), objectMatrix);
            }
            else if (gizmo.id === BOTTOM_LEFT_GIZMO_ID) {
              vec3.transformMat3(gizmoPos, vec3.fromValues(0, image.height, 1), objectMatrix);
            }
            else if (gizmo.id === BOTTOM_RIGHT_GIZMO_ID) {
              vec3.transformMat3(gizmoPos, vec3.fromValues(image.width, image.height, 1), objectMatrix);
            }
            
            gizmo.position.x = gizmoPos[0] - (GIZMO_SIZE / 2);
            gizmo.position.y = gizmoPos[1] - (GIZMO_SIZE / 2);
            // rescale
            gizmo.scale.x = 1 / moodboard.cameraProjectionMatrix[0];

            gizmo.render(moodboard.gl, moodboard.cameraProjectionMatrix, borderShader);
            
          }

        } else {
          
          image.render(moodboard.gl, moodboard.cameraProjectionMatrix);
        }
          
        
      }
    }

    moodboard.gl.bindFramebuffer(moodboard.gl.FRAMEBUFFER, null);

    moodboard.gl.useProgram(this.bufferProgram);
    moodboard.gl.bindVertexArray(this.bufferVao);
    moodboard.gl.bindTexture(moodboard.gl.TEXTURE_2D, this.fragColorTexture);
    moodboard.gl.drawArrays(moodboard.gl.TRIANGLE_STRIP, 0, 4);

    moodboard.gl.bindTexture(moodboard.gl.TEXTURE_2D, null);
    moodboard.gl.bindVertexArray(null);
  }
}

class MoodboardInputComponent {
  
  mouse : Mouse = {position: {x: 0, y: 0}, delta: {x: 0, y: 0}, isDown: false};

  setup(moodboard: Moodboard) {
    // setup mouse listeners

    document.addEventListener('mousedown', (event) => {
      this.mouse.isDown = true;
      this.mouse.position.x = event.pageX;
      this.mouse.position.y = event.pageY;
      this.mouse.delta = {x: 0, y: 0};

      moodboard.renderComponent.pickAt(moodboard, this.mouse.position);

      if (moodboard.selectedIndex === -1) {
        moodboard.selectedImage = moodboard.selectedIndex;
        return;
      }
      // move in render order
      console.log(moodboard.renderOrder);
      
      if (moodboard.selectedIndex < RESERVED_ID_NUM)
        return;

      // set image!
      moodboard.selectedImage = moodboard.selectedIndex;

      moodboard.renderOrder.splice(moodboard.renderOrder.findIndex(index => index === moodboard.selectedIndex), 1);
      moodboard.renderOrder.push(moodboard.selectedIndex);

    });
    document.addEventListener('mousemove', (event) => {
      
      this.mouse.delta = {x: event.pageX - this.mouse.position.x, y: event.pageY - this.mouse.position.y};
      this.mouse.position.x = event.pageX;
      this.mouse.position.y = event.pageY;
      
      if (!this.mouse.isDown) 
        return;

      this.mouse.delta.x /= moodboard.cameraScale.x;
      this.mouse.delta.y /= moodboard.cameraScale.y;
      if (moodboard.selectedIndex !== -1) {
        // check if is an actual image

        const image = moodboard.images.get(moodboard.selectedImage)
        if (image === undefined)
          return;

        // let's do gizmos
        if (moodboard.selectedIndex === TOP_LEFT_GIZMO_ID) {
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

          vec3.transformMat3(preZoom, vec3.fromValues(image.width, image.height, 1), objectMatrix);

          // if gizmo, we need to move position to match

          // transform mouse position to world position

          // todo fix for rectangular images
          const mouseWorldPos = vec3.create();
          mouseWorldPos[0] = (this.mouse.position.x / moodboard.cameraScale.x - moodboard.cameraPosition.x);
          mouseWorldPos[1] = (this.mouse.position.y / moodboard.cameraScale.y - moodboard.cameraPosition.y);

          // find new width
          const newWidth = preZoom[0] - mouseWorldPos[0];
          
          const newHeight = (preZoom[1] - mouseWorldPos[1]);
          const newScale = ((newWidth / image.width) + (newHeight / image.height))/2;

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
      if (moodboard.selectedIndex === -1) {
        moodboard.cameraPosition.x += this.mouse.delta.x;
        moodboard.cameraPosition.y += this.mouse.delta.y;
      }
      
      
      
    });
    document.addEventListener('mouseup', () => this.mouse.isDown = false);
    document.addEventListener('wheel', (event) => {

      const preZoom = vec3.create();
      
      
      // convert to world coords

      preZoom[0] = (this.mouse.position.x / moodboard.cameraScale.x - moodboard.cameraPosition.x);
      preZoom[1] = (this.mouse.position.y / moodboard.cameraScale.y - moodboard.cameraPosition.y);


      moodboard.zoomLinear += event.deltaY * -0.015;
      
      moodboard.cameraScale.x = Math.exp(moodboard.zoomLinear * 0.1);

      moodboard.cameraScale.y = moodboard.cameraScale.x;

      const postZoom = vec3.create();
      

      postZoom[0] = (this.mouse.position.x / moodboard.cameraScale.x - moodboard.cameraPosition.x);
      postZoom[1] = (this.mouse.position.y / moodboard.cameraScale.y - moodboard.cameraPosition.y);

      moodboard.cameraPosition.x += postZoom[0] - preZoom[0];
      moodboard.cameraPosition.y += postZoom[1] - preZoom[1];
      
    });
  }
}

export { Moodboard };