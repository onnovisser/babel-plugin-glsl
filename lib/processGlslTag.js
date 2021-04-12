const { readFileSync } = require('fs');
const { dirname, resolve } = require('path');
const { types: t } = require('@babel/core');
const evaluateExpression = require('./evaluateExpression');
const compile = require('./compile');

function processGlslTag(path, state) {
  const cwd = dirname(state.filename);
  const env = { cwd };

  if (
    t.isCallExpression(path.node) &&
    t.isStringLiteral(path.node.arguments[0])
  ) {
    const filename = resolve(
      dirname(state.filename),
      path.node.arguments[0].value
    );
    const contents = readFileSync(filename, "utf8");
    const result = compile(contents, { basedir: dirname(filename) });
    path.replaceWith(t.stringLiteral(result));
    return;
  } else {
    const literal = evaluateExpression(path, path, env);
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
      return;
    }
  }

  throw new Error(
    'babel-plugin-glsl: string template could not be evaluated'
  );
}

module.exports = processGlslTag;
