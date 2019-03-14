import glsl from 'glslify';

glsl`
  #pragma glslify: import(./defines)
  void main () {
    gl_FragColor = vec4(#ff0000, 1);
  }
`;
