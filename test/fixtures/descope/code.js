import glsl from 'glslify';

glsl`
  #pragma glslify: randomColor = require(./randomColor)

  float rand() {
    return 0.42;
  }

  void main () {
    gl_FragColor = vec4(randomColor(), 1);
  }
`;
