function createShader({
  alpha
}) {
  return `

    #define ALPHA ${alpha}

    #define FOO ${globalThis.foo}

    void main () {
      gl_FragColor = vec4(1, 0, 0, ALPHA);
    }
  `;
}
