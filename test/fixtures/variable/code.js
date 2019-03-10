import glsl from 'glslify';

let alpha = 1;
alpha = 0.5;

glsl`
  #define ALPHA ${alpha}
  void main () {
    gl_FragColor = vec4(1, 0, 0, 1);
  }
`;
