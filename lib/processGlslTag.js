const { dirname } = require('path');
const stringifyExpression = require('./stringifyExpression');
const compile = require('./compile');

function processGlslTag(path, state, babel) {
  const { types: t } = babel;

  const stringInput = stringifyExpression(path, path.node.quasi, babel);
  if (typeof stringInput !== 'string') {
    throw new Error(
      'babel-plugin-glsl: string template could not be evaluated'
    );
  }

  const cwd = dirname(state.filename);
  const result = compile(stringInput, { basedir: cwd });
  path.replaceWith(t.stringLiteral(result));
}

module.exports = processGlslTag;
