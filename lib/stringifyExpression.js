function stringifyExpression(path, expression, babel) {
  const { types: t } = babel;

  const stringifyFns = [
    [t.isLiteral, stringifyLiteral],
    [t.isIdentifier, stringifyIdentifier],
    [t.isUnaryExpression, stringifyUnaryExpression],
    [t.isBinaryExpression, stringifyBinaryExpression],
    [t.isArrayExpression, stringifyArrayExpression],
  ];

  for (let i = 0; i < stringifyFns.length; i++) {
    const [test, fn] = stringifyFns[i];
    if (test(expression)) return fn(path, expression, babel);
  }

  throw new Error(
    `babel-plugin-glsl: cannot stringify expression of type "${
      expression.type
    }"`
  );
}

function stringifyLiteral(path, expression, babel) {
  if (expression.type !== 'TemplateLiteral') {
    return expression.value;
  }

  const quasis = expression.quasis;
  return expression.expressions
    .reduce(
      (prev, expr, i) => {
        prev.push(
          stringifyExpression(path, expr, babel),
          quasis[i + 1].value.cooked
        );
        return prev;
      },
      [quasis[0].value.cooked]
    )
    .join('');
}

function stringifyIdentifier(path, expression, babel) {
  const binding = path.scope.getBinding(expression.name);
  if (binding) {
    const initPath = binding.path.get('init');

    if (initPath.node) {
      return stringifyExpression(initPath, initPath.node, babel);
    }
  } else if (expression.name === 'undefined') {
    return undefined;
  }

  throw new Error(
    `babel-plugin-glsl: cannot resolve glslify() call, unknown or non-initialized identifier "${
      expression.name
    }"`
  );
}

function stringifyUnaryExpression(path, expression, babel) {
  const value = stringifyExpression(path, expression.argument, babel);
  // prettier-ignore
  switch (expression.operator) {
      case '+': return +value
      case '-': return -value
      case '!': return !value
      case '~': return ~value
      case 'typeof': return typeof value
      case 'void': return void value
    }
  throw new Error(
    `babel-plugin-glsl: unsupported unary operator "${expression.operator}"`
  );
}

function stringifyBinaryExpression(path, expression, babel) {
  const left = stringifyExpression(path, expression.left, babel);
  const right = stringifyExpression(path, expression.right, babel);
  // prettier-ignore
  switch (expression.operator) {
          case '+': return left + right
          case '-': return left - right
          case '*': return left * right
          case '&': return left & right
          case '/': return left / right
          case '%': return left % right
          case '|': return left | right
          case '^': return left ^ right
          case '||': return left || right
          case '&&': return left && right
          case '<<': return left << right
          case '>>': return left >> right
          case '>>>': return left >>> right
          case '===': return left === right
          case '!==': return left !== right
          case '<': return left < right
          case '>': return right < left
          case '<=': return left <= right
          case '>=': return left >= right
        }
  throw new Error('babel-plugin-glsl: unsupported binary expression');
}

function stringifyArrayExpression(path, expression, babel) {
  return expression.elements.map(prop =>
    stringifyExpression(path, prop, babel)
  );
}

module.exports = stringifyExpression;
