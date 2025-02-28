import { glMatrix, mat4 } from "gl-matrix";
import { resizeCanvasToDisplaySize } from "../lib/webgl-utils.js";

function drawScene(gl: WebGL2RenderingContext, programInfo: any, buffers: any) {

  gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
  gl.clearDepth(1.0); // Clear everything
  gl.enable(gl.DEPTH_TEST); // Enable depth testing
  gl.depthFunc(gl.LEQUAL); // Near things obscure far things

  // // Clear the canvas before we start drawing on it.

  // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  resizeCanvasToDisplaySize(gl.canvas);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  gl.bindVertexArray(buffers.vao);
  

  {
    const offset = 0;
    const vertexCount = 6;
    gl.drawElements(gl.TRIANGLE_STRIP, vertexCount, gl.UNSIGNED_INT, offset);
  }
}


export { drawScene };
