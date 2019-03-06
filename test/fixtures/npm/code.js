import glsl from 'glslify';

glsl`
  #pragma glslify: random = require(glsl-random)

  void main () {
    float brightness = random(gl_FragCoord.xy / resolution.xy);
    gl_FragColor = vec4(vec3(brightness), 1.0);
  }
`;
