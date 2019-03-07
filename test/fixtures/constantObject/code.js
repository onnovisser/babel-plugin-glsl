import glsl from 'glslify';

const PI = 'PI';
const constants = {
  ALPHA: 1,
  ['E']: 2.718281828459045,
  [PI]: 3.141592653589793,
};

glsl`
  uniform float time;
  void main () {
    float brightness = pow(${constants.E}, -sin(time * ${constants['PI']}));
    gl_FragColor = vec4(vec3(brightness), ${constants.ALPHA});
  }
`;
