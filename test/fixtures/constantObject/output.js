const PI = 'PI';
const constants = {
  ALPHA: 1,
  ['E']: 2.718281828459045,
  [PI]: 3.141592653589793
};
"\n  uniform float time;\n  void main () {\n    float brightness = pow(2.718281828459045, -sin(time * 3.141592653589793));\n    gl_FragColor = vec4(vec3(brightness), 1);\n  }\n";