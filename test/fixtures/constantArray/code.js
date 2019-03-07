import glsl from 'glslify';

const COLOR = [1, 0.5, 0];

glsl`
  #define COLOR vec3(${COLOR})
  void main () {
    gl_FragColor = vec4(COLOR, 1);
  }
`;
