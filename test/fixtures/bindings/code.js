import glsl from 'glslify';

glsl`
  uniform sampler2D uTexture;
  uniform vec2 uCenter;
  #pragma glslify: texture = require(./texture, tex=uTexture, center=uCenter)
  void main () {
    gl_FragColor = texture(gl_FragCoord);
  }
`;
