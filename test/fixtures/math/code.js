import glsl from 'glslify';

const PI = Math.PI;

glsl`
  #define PI ${PI}
  #define HALF_PI ${0.5 * PI}
  #define TWO_PI ${2 * PI}
`;
