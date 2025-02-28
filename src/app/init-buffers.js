
function initBuffers(gl) {
  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const positionBuffer = initPositionBuffer(gl);
  const elementBuffer = initElementBuffer(gl);

  return {
    position: positionBuffer,
    element: elementBuffer,
    vao: vao,
  };
}

function initPositionBuffer(gl) {
  // Create a buffer for the square's positions.
  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.
  var positions = [
    10, 20,
    100, 20,
    10, 100,
    100, 100,
  ];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return positionBuffer;
}

function initElementBuffer(gl) {
  // Create a buffer for the square's positions.
  const elementBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);

  // Now create an array of positions for the square.
  var indices = [
    0, 1, 3,
    1, 2, 3
  ];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(indices), gl.STATIC_DRAW);

  return elementBuffer;
}

export { initBuffers };
