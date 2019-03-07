import glsl from 'glslify';

const ALPHA =
  (((((-1 >>> 0) << ~1) >> ((!1 + 1 && 1 === 1) || 1 > 1)) % 1 ^ 1) & 1) | 1;

glsl`
  void main () {
    gl_FragColor = vec4(1, 0, 0, ${ALPHA});
  }
`;
