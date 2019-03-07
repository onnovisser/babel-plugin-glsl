import glsl from 'glslify';
import constants, { PI } from './constants';

glsl`
  uniform float time;
  void main () {
    float brightness = pow(${constants.E}, -sin(time * ${PI}));
    gl_FragColor = vec4(vec3(brightness), 1);
  }
`;
