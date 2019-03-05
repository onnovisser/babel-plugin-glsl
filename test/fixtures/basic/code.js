import glsl from 'glslify';

glsl`
  #pragma glslify: rgb = require(./rgb)
  void main () {
    gl_FragColor = vec4(rgb(255, 0, 0), 1);
  }
`;
