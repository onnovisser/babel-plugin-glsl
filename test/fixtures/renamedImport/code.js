import foo from 'glslify';

foo`
  void main () {
    gl_FragColor = vec4(1, 0, 0, 1);
  }
`;
