const pluginTester = require('babel-plugin-tester');
const plugin = require('babel-plugin-macros');

pluginTester({
  plugin,
  babelOptions: { filename: __filename },
  tests: [
    {
      code: `
        import glsl from '../macro';

        glsl\`
        void main () {
          gl_FragColor = vec4(1, 0, 0, 1);
        }\`;
      `,
      output: '"\\nvoid main () {\\n  gl_FragColor = vec4(1, 0, 0, 1);\\n}";',
    },
    {
      code: `
        import glsl from '../macro';

        glsl("./macroFixtures/externalFile/myshader.frag");
      `,
      output: '"#define E 2.718281828459045\\n#define PI 3.141592653589793\\n\\nvoid main () {\\n  gl_FragColor = vec4(vec3(1.,0.,0.), 1);\\n}\\n";',
    },
  ],
});
