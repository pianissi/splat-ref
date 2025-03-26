import { resizeCanvasToDisplaySize } from "@/lib/webgl-utils";
import { borderFs, borderVs, defaultFs, defaultVs, framebufferFs, framebufferVs, initShaderProgram } from "./shaders";
import { mat3, vec3 } from "gl-matrix";
import { ImageSerial, MoodboardData, MoodboardSerial, Mouse, Vector2 } from "./types";
import { MoodboardImage } from "./image";
import { VERSION } from "@/components/constants";
import { MoodboardObject, updateMoodboard } from "@/api/moodboard";

const RESERVED_ID_NUM = 100;

export const UNSELECTED = 0;

const TOP_LEFT_GIZMO_ID = 2;
const TOP_RIGHT_GIZMO_ID = 3;
const BOTTOM_LEFT_GIZMO_ID = 4;
const BOTTOM_RIGHT_GIZMO_ID = 5;

const GIZMO_SIZE = 20;

const BORDER_WIDTH = 5;

// https://web.dev/patterns/files/save-a-file
const saveFile = async (obj: JSON, suggestedName: string) => {

  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: 'application/json',
  });
  // Fallback if the File System Access API is not supported…
  // Create the blob URL.
  const blobURL = URL.createObjectURL(blob);
  // Create the `<a download>` element and append it invisibly.
  const a = document.createElement('a');
  a.href = blobURL;
  a.download = suggestedName;
  a.style.display = 'none';
  document.body.append(a);
  // Programmatically click the element.
  a.click();
  // Revoke the blob URL and remove the element.
  setTimeout(() => {
    URL.revokeObjectURL(blobURL);
    a.remove();
  }, 1000);
};

class Moodboard {
  canvas: HTMLCanvasElement | null;
  gl: WebGL2RenderingContext | null;

  idCount = RESERVED_ID_NUM;

  cameraPosition = {x: 0, y: 0}; 
  cameraScale = {x: 1, y: 1};
  zoomLinear = 1;
  cameraProjectionMatrix = mat3.create();

  selectedIndex = UNSELECTED;
  selectedImage = UNSELECTED;

  renderComponent = new MoodboardRenderComponent();
  inputComponent = new MoodboardInputComponent();

  shaderPrograms = new Map<string, WebGLProgram>();

  images = new Map<number, MoodboardImage>();
  gizmos : MoodboardImage[];

  renderOrder: number[];

  moodboardData : MoodboardData = {"moodboardId": -1, "ownerId": -1, "moodboardName": "unassigned moodboard name", "thumbnail": null};
  
  constructor(moodboardData: MoodboardData) {
    this.renderOrder = [];
    this.gizmos = [];
    this.gl = null;
    this.canvas = null;
    this.moodboardData = moodboardData;
  }

  renameMoodboard(name: string) {
    this.moodboardData.moodboardName = name;
  }

  getSelectedImageId() {
    return this.selectedImage;
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
    const mouseWorldPos = vec3.create();
    mouseWorldPos[0] = (this.inputComponent.mouse.position.x  / this.cameraScale.x - this.cameraPosition.x);
    mouseWorldPos[1] = (this.inputComponent.mouse.position.y  / this.cameraScale.y - this.cameraPosition.y);
    this.loadImage(image, image.width, image.height, {x: mouseWorldPos[0], y: mouseWorldPos[1]}, {x: 1, y: 1});
  }

  loadImage(image: HTMLImageElement, width: number, height: number, position: Vector2, scale: Vector2) {
    const shaderProgram = this.shaderPrograms.get("default");
    if (shaderProgram === undefined)
      return

    if (this.gl === null) 
      return;

    console.log(image);
    const newImage = new MoodboardImage(width, height, position, shaderProgram, this.gl, this.idCount, image);
    newImage.setScale(scale);
    this.images.set(this.idCount, newImage);
    this.renderOrder.push(newImage.id);

    this.idCount += 1;
    console.log("image loaded");
  }

  deleteImage(imageId: number) {
    console.log("deleting: " + imageId);
    this.images.get(imageId)?.unmount();
    this.images.delete(imageId);
    this.renderOrder.filter((id) => {return id !== imageId});

    if (imageId === this.selectedImage)
      this.selectedImage = UNSELECTED;
  }

  setCameraAttributes(cameraPosition : Vector2, zoomLinear: number) {
    this.cameraPosition = cameraPosition;
    this.cameraScale.x = Math.exp(zoomLinear * 0.1);
    this.cameraScale.y = this.cameraScale.x;
  }

  async toImageSerial(image: HTMLImageElement | null, width: number, height: number, position: Vector2, scale: Vector2) {
    return new Promise<ImageSerial>(async (resolve, reject) => {
      if (image === null) {
        reject();
        return;
      }

      if (image.src === null) {
        reject();
        return;
      }
      
      const response = await fetch(image.src);

      const blob = await response.blob();
      
      const reader = new FileReader();
      
      reader.onloadend = function () {

        if (typeof this.result !== "string") {
          reject();
          return;
        }
        resolve({
          "width": width,
          "height": height,
          "position": position,
          "scale": scale,
          "data": this.result,
        });
      }
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async toObj() {
    const images : ImageSerial[] = [];

    const promises: Promise<ImageSerial>[] = [];

    await new Promise(async (resolve, reject) => {
      this.canvas?.toBlob((blob) => {
        if (blob === null) {
          console.log("huh?")
          reject();
          return;
        }
        this.moodboardData.thumbnail?.remove();
        this.moodboardData.thumbnail = new Image();
        const url = URL.createObjectURL(blob);
  
        this.moodboardData.thumbnail.onload = () => {
          resolve(true);
        }

        this.moodboardData.thumbnail.src = url;
      }, "image/jpeg", 0.95);
    });

    for (const [, image] of this.images) {
      
      const promise = this.toImageSerial(image.image, image.width, image.height, image.position, image.scale);
      promises.push(promise);
    }

    await Promise.all(promises).then((imagePromises) => {
      for (const image of imagePromises) {
        images.push(image);
      }
      console.log(imagePromises);
    })

    // time to screenshot
    
    let thumbnailData;

    if (this.moodboardData.thumbnail) {
      await this.toImageSerial(this.moodboardData.thumbnail, -1, -1, {x:0, y:0}, {x:1, y:1}).then((imagePromise) => {
        thumbnailData = imagePromise;
      })
    }

    return {
      "version": VERSION,
      "images": images,
      "id": this.moodboardData.moodboardId,
      "thumbnail": thumbnailData,
      "name": this.moodboardData.moodboardName,
      "ownerId": this.moodboardData.ownerId,
      "cameraPosition": this.cameraPosition,
      "cameraScale": this.cameraScale,
      "zoomLinear": this.zoomLinear,
    };
  }

  async toJson() {
    return await this.toObj().then((obj) => {
      return <JSON><unknown>obj;
    })
  }
  
  async fromJSON(obj: MoodboardSerial) {
    if (!("images" in obj))
      return;

    if ("thumbnail" in obj) {
      this.loadImageSerial(obj.thumbnail, (imageElement, width, height, position, scale) => {
        this.moodboardData.thumbnail = imageElement;
      });
    }
    // if ("id" in obj) {
    //   this.moodboardData.moodboardId = obj.id;
    // }

    if ("cameraPosition" in obj) {
      this.cameraPosition = obj.cameraPosition;
    }

    if ("cameraScale" in obj) {
      this.cameraScale = obj.cameraScale;
    }

    if ("zoomLinear" in obj) {
      this.zoomLinear = obj.zoomLinear;
    }

    if ("name" in obj) {
      this.moodboardData.moodboardName = obj.name;
    }

    if ("ownerId" in obj) {
      this.moodboardData.ownerId = obj.ownerId;
    }
    
    for (const image of obj.images) {
      this.loadImageSerial(image, this.loadImage.bind(this))
    }
  }

  loadImageSerial(image: ImageSerial, onLoad:(imageElement: HTMLImageElement, width: number, height: number, position: Vector2, scale: Vector2)=>void) {
    fetch(image.data).then(res => res.blob()).then((myBlob) => {
      const objectURL = URL.createObjectURL(myBlob);
      const imageElement = new Image();
      // const loadImage = () => {
      //   this.loadImage();
      // }
      imageElement.addEventListener('load', function() {
        console.log("callback")
        // Now that the image has loaded make copy it to the texture.
        onLoad(imageElement, image.width, image.height, image.position, image.scale);
      });
      imageElement.src = objectURL;
      document.body.appendChild(imageElement);
      console.log(objectURL);
      console.log(imageElement);
      
    });
  }

  async saveMoodboard() {
    this.toJson().then((json) => saveFile(json, this.moodboardData.moodboardName + ".json"));
  }

  setMoodboardMetadata(moodboardData: MoodboardData) {
    this.moodboardData = moodboardData;
  }

  async saveMoodboardToLocalDb() {
    this.toObj().then((obj) => {
      const data = JSON.stringify(<JSON><unknown>obj);

      const moodboardObj :MoodboardObject = {
        moodboardId: this.moodboardData.moodboardId,
        moodboardName: this.moodboardData.moodboardName,
        ownerId: this.moodboardData.ownerId,
        thumbnail: obj.thumbnail,
        moodboardData: data,
      };

      updateMoodboard(moodboardObj);
    });
  }

  process() {
    this.renderComponent.process(this);
  }

  unmount() {
    this.inputComponent.remove(this);
    for (const [, image] of this.images)  {
      image.unmount();
    }
    this.moodboardData.thumbnail?.remove();
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

    const result = resizeCanvasToDisplaySize(moodboard.gl.canvas)
    if (result === false)
      return;

    moodboard.gl.viewport(0, 0, moodboard.gl.canvas.width, moodboard.gl.canvas.height);

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
    moodboard.gl.clearBufferiv(moodboard.gl.COLOR, 1, new Int16Array([ UNSELECTED,UNSELECTED,UNSELECTED,UNSELECTED ]));
    moodboard.gl.clear(moodboard.gl.COLOR_BUFFER_BIT | moodboard.gl.DEPTH_BUFFER_BIT);

    for (const imageId of moodboard.renderOrder) {
      const image = moodboard.images.get(imageId);
      if (image !== undefined) {
        // console.log("true");
        if (moodboard.selectedImage === imageId) {

          // RENDER BORDER
          // scale then unscale

          let borderWidthX = BORDER_WIDTH / (moodboard.cameraProjectionMatrix[0] * image.width);
          let borderWidthY = BORDER_WIDTH / (moodboard.cameraProjectionMatrix[0] * image.height);

          if (image.scale.x < 0)
            borderWidthX *= -1;

          if (image.scale.y < 0)
            borderWidthY *= -1;

          image.setScale({x: image.scale.x + borderWidthX, y: image.scale.y + borderWidthY})
          image.render(moodboard.gl, moodboard.cameraProjectionMatrix, borderShader);
          image.setScale({x: image.scale.x - borderWidthX, y: image.scale.y - borderWidthY})
          
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
            
            gizmo.setPosition({x: gizmoPos[0] - (GIZMO_SIZE / 2), y: gizmoPos[1] - (GIZMO_SIZE / 2)});
            // rescale
            gizmo.setScale({x: 1 / moodboard.cameraProjectionMatrix[0], y: 1 / moodboard.cameraProjectionMatrix[0]});

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

  handleMouseDown : (event: MouseEvent) => void = () => {};
  handleMouseMove : (event: MouseEvent) => void = () => {};
  handleMouseUp : (event: MouseEvent) => void = () => {};
  handleWheel : (event: WheelEvent) => void = () => {};
  handleKeyDown : (event: KeyboardEvent) => void = () => {};
  
  setup(moodboard: Moodboard) {
    // // setup mouse listeners
    // this.handleMouseDown = this.onMouseDown.bind(this, event, moodboard);
    document.addEventListener('mousedown', this.handleMouseDown = (event) => {
      this.onMouseDown(event, moodboard);
    });
    document.addEventListener('mousemove', this.handleMouseMove = (event) => {
      this.onMouseMove(event, moodboard);
    });
    document.addEventListener('mouseup', this.handleMouseUp = (event) => {
      this.onMouseUp();
    });
    document.addEventListener('wheel', this.handleWheel = (event) => {
      this.onWheel(event, moodboard);
    });
    document.addEventListener('keydown', this.handleKeyDown = (e) => {
      this.onKeyDown(e, moodboard);
    });
  }

  
  remove(moodboard: Moodboard) {

    console.log("i am being removed");
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  

  onMouseDown(event: MouseEvent, moodboard: Moodboard) {
    this.mouse.isDown = true;
    this.mouse.position.x = event.pageX;
    this.mouse.position.y = event.pageY;
    this.mouse.delta = {x: 0, y: 0};

    moodboard.renderComponent.pickAt(moodboard, this.mouse.position);

    if (moodboard.selectedIndex === UNSELECTED) {
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

  }

  onMouseMove(event: MouseEvent, moodboard: Moodboard) {
    
    this.mouse.delta = {x: event.pageX - this.mouse.position.x, y: event.pageY - this.mouse.position.y};
    this.mouse.position.x = event.pageX;
    this.mouse.position.y = event.pageY;
    this.mouse.delta.x /= moodboard.cameraScale.x;
    this.mouse.delta.y /= moodboard.cameraScale.y;
    
    if (!this.mouse.isDown) 
      return;

    if (moodboard.selectedIndex !== UNSELECTED) {
      // check if is an actual image

      const image = moodboard.images.get(moodboard.selectedImage)
      if (image === undefined)
        return;

      // let's do gizmos
      if (moodboard.selectedIndex === TOP_LEFT_GIZMO_ID || moodboard.selectedIndex === TOP_RIGHT_GIZMO_ID || moodboard.selectedIndex === BOTTOM_LEFT_GIZMO_ID || moodboard.selectedIndex === BOTTOM_RIGHT_GIZMO_ID) {
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

        let offset = vec3.fromValues(image.width, image.height, 1);
        if (moodboard.selectedIndex === TOP_LEFT_GIZMO_ID) {
          offset = vec3.fromValues(image.width, image.height, 1);
        } else if (moodboard.selectedIndex === TOP_RIGHT_GIZMO_ID) {
          offset = vec3.fromValues(0, image.height, 1);
        } else if (moodboard.selectedIndex === BOTTOM_LEFT_GIZMO_ID) {
          offset = vec3.fromValues(image.width, 0, 1);
        } else if (moodboard.selectedIndex === BOTTOM_RIGHT_GIZMO_ID) {
          offset = vec3.fromValues(0, 0, 1);
        }

        vec3.transformMat3(preZoom, offset, objectMatrix);

        // transform mouse position to world position

        const mouseWorldPos = vec3.create();
        mouseWorldPos[0] = (this.mouse.position.x / moodboard.cameraScale.x - moodboard.cameraPosition.x);
        mouseWorldPos[1] = (this.mouse.position.y / moodboard.cameraScale.y - moodboard.cameraPosition.y);

        let newWidth = 0;
        let newHeight = 0;
        if (moodboard.selectedIndex === TOP_LEFT_GIZMO_ID) {
          newWidth = preZoom[0] - mouseWorldPos[0];
          newHeight = preZoom[1] - mouseWorldPos[1];
        } else if (moodboard.selectedIndex === TOP_RIGHT_GIZMO_ID) {
          newWidth = mouseWorldPos[0] - preZoom[0];
          newHeight = preZoom[1] - mouseWorldPos[1];
        } else if (moodboard.selectedIndex === BOTTOM_LEFT_GIZMO_ID) {
          newWidth = preZoom[0] - mouseWorldPos[0];
          newHeight = mouseWorldPos[1] - preZoom[1];
        } else if (moodboard.selectedIndex === BOTTOM_RIGHT_GIZMO_ID) {
          newWidth = mouseWorldPos[0] - preZoom[0];
          newHeight = mouseWorldPos[1] - preZoom[1];
        }
        const newScale = ((newWidth / image.width) + (newHeight / image.height))/2;

        // change the scale to match
        image.setScale({x: newScale, y: newScale});

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
        

        vec3.transformMat3(postZoom, offset, objectMatrix);

        image.move({x: -postZoom[0] + preZoom[0], y: -postZoom[1] + preZoom[1]});

      } else {
        image.move(this.mouse.delta);
      }
    }
    if (moodboard.selectedIndex === UNSELECTED) {
      moodboard.cameraPosition.x += this.mouse.delta.x;
      moodboard.cameraPosition.y += this.mouse.delta.y;
    }
  }

  onMouseUp() {
    this.mouse.isDown = false;
  }

  onWheel(event: WheelEvent, moodboard: Moodboard) {
    const preZoom = vec3.create();
    // convert to world coords

    preZoom[0] = (this.mouse.position.x / moodboard.cameraScale.x - moodboard.cameraPosition.x);
    preZoom[1] = (this.mouse.position.y / moodboard.cameraScale.y - moodboard.cameraPosition.y);

    // we compute zoom here
    moodboard.zoomLinear += event.deltaY * -0.015;
    moodboard.cameraScale.x = Math.exp(moodboard.zoomLinear * 0.1);
    moodboard.cameraScale.y = moodboard.cameraScale.x;

    const postZoom = vec3.create();

    postZoom[0] = (this.mouse.position.x / moodboard.cameraScale.x - moodboard.cameraPosition.x);
    postZoom[1] = (this.mouse.position.y / moodboard.cameraScale.y - moodboard.cameraPosition.y);

    // move position to mouse location
    moodboard.cameraPosition.x += postZoom[0] - preZoom[0];
    moodboard.cameraPosition.y += postZoom[1] - preZoom[1];
    
  }

  onKeyDown(e: KeyboardEvent, moodboard: Moodboard) {
    if (e.key === "Delete") {
      if (moodboard.selectedImage === UNSELECTED)
        return;
      moodboard.deleteImage(moodboard.selectedImage);
      return;
    }
    // if (e.key === "s") {
    //   moodboard.saveMoodboard();
    //   return;
    // }
  }

}

export { Moodboard };