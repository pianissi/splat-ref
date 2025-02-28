
function setupModel(gl: WebGL2RenderingContext, buffers: any, programInfo: any) {
  
  setPositionAttribute(gl, buffers, programInfo);
  
  gl.uniform2f(programInfo.uniformLocations.resolutionUniform, gl.canvas.width, gl.canvas.height);
}

// Tell WebGL how to pull out the positions from the position
// buffer into the vertexPosition attribute.
function setPositionAttribute(gl: WebGL2RenderingContext, buffers: any, programInfo: any) {
  const numComponents = 2; // pull out 2 values per iteration
  const type = gl.FLOAT; // the data in the buffer is 32bit floats
  const normalize = false; // don't normalize
  const stride = 0; // how many bytes to get from one set of values to the next
  // 0 = use type and numComponents above
  const offset = 0; // how many bytes inside the buffer to start from
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

export {setupModel}