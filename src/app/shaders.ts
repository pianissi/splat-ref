function initShaderProgram(gl  : WebGL2RenderingContext, vsSource : string, fsSource : string) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  if (vertexShader === null || vertexShader === undefined)
    return;

  if (fragmentShader === null || fragmentShader === undefined)
    return;
  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(
      `Unable to initialize the shader program: ${gl.getProgramInfoLog(
        shaderProgram,
      )}`,
    );
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl : WebGL2RenderingContext, type : GLenum, source : string) {
  const shader = gl.createShader(type);

  if (shader === null)
    return;

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

const defaultVs = `#version 300 es
    layout (location = 0) in vec2 a_position;
    layout (location = 1) in vec2 a_texcoord;

    uniform vec2 u_resolution;

    uniform mat3 u_objectMatrix;
    uniform mat3 u_cameraMatrix;

    out vec2 texCoord;

    void main() {
      texCoord = a_texcoord;
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

const defaultFs = `#version 300 es
  precision highp float;
  precision mediump int;

  layout (location=0) out vec4 outColor;
  layout (location=1) out int id;

  in vec2 texCoord;

  uniform sampler2D ourTexture;

  uniform int u_id; 

  void main() {
    outColor = texture(ourTexture, texCoord * vec2(1, -1));
    id = u_id;
  }
`;

const framebufferVs = `#version 300 es
layout (location = 0) in vec4 a_position;
layout (location = 1) in vec2 a_texcoord;

out vec2 texCoord;

void main() {
  gl_Position = a_position;
  texCoord = a_texcoord;
}
`;

const framebufferFs = `#version 300 es
  precision mediump float;

  uniform sampler2D sampler;

  in vec2 texCoord;

  out vec4 outColor;

  void main() {
    outColor = texture(sampler, texCoord);
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
    outColor = vec4(0.0, 1.0, 1.0, 1.0);
    id = u_id;
  }
`;

export { initShaderProgram, defaultVs, defaultFs, framebufferVs, framebufferFs, borderVs, borderFs};