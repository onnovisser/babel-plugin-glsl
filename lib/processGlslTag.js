const { dirname } = require('path');
const { types: t } = require('@babel/core');
const evaluateExpression = require('./evaluateExpression');
const compile = require('./compile');

function processGlslTag(path, state) {
  const cwd = dirname(state.filename);
  const env = {
    cwd,
  };
  const literal = evaluateExpression(path, path.node.quasi, env);

  if (t.isTemplateLiteral(literal)) {
    literal.quasis = literal.quasis.map(quasi => {
      quasi.value.raw = `\n${compile(quasi.value.raw, { basedir: cwd })}`;
      return quasi;
    });
    path.replaceWith(literal);
    return;
  } else if (typeof literal === 'string') {
    const result = compile(literal, { basedir: cwd });
    path.replaceWith(t.stringLiteral(result));
  } else {
    throw new Error(
      'babel-plugin-glsl: string template could not be evaluated'
    );
  }
}

module.exports = processGlslTag;
