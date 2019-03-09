function createShader({
  alpha
}) {
  return `

    #define ALPHA ${alpha}

    void main () {
      gl_FragColor = vec4(1, 0, 0, ALPHA);
    }
  `;
}