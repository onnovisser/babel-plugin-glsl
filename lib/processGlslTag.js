const { dirname } = require('path');
const { evalConstant } = require('./utils');
const compile = require('./compile');

function processGlslTag(path, state, { types: t }) {
  const cwd = dirname(state.filename);
  const env = {
    cwd,
  };

  const stringInput = evalConstant(env, path, path.node.quasi);
  if (typeof stringInput !== 'string') {
    throw new Error(
      'babel-plugin-glsl: string template could not be evaluated'
    );
  }

  const result = compile(stringInput, { basedir: cwd });
  path.replaceWith(t.stringLiteral(result));
}

module.exports = processGlslTag;
