const pluginTester = require('babel-plugin-tester');
const plugin = require('..');
const path = require('path');

pluginTester({
  plugin,
  babelOptions: { filename: __filename },
  fixtures: path.join(__dirname, 'fixtures'),
  tests: [
    {
      code: `
        import glsl from 'glslify';

        glsl\`
        #define ALPHA \${alpha}
        \`;
      `,
      error: /non-initialized identifier/,
    },
    {
      code: `
        import glsl from 'glslify';
        import { FOO } from './fixtures/constantImported/constants';

        glsl\`
        #define FOO \${FOO}
        \`;
      `,
      error: /not exported/,
    },
  ],
});
