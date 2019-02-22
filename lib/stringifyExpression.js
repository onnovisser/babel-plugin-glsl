const { types: t } = require('@babel/core');

function stringifyExpression(path, expression) {
  const stringifyFns = [
    [t.isLiteral, stringifyLiteral],
    [t.isIdentifier, stringifyIdentifier],
    [t.isUnaryExpression, stringifyUnaryExpression],
    [t.isBinaryExpression, stringifyBinaryExpression],
    [t.isArrayExpression, stringifyArrayExpression],
  ];

  for (let i = 0; i < stringifyFns.length; i++) {
    const [test, fn] = stringifyFns[i];
    if (test(expression)) return fn(path, expression);
  }

  throw new Error(
    `babel-plugin-glsl: cannot stringify expression of type "${
      expression.type
    }"`
  );
}

function stringifyLiteral(path, expression) {
  if (expression.type !== 'TemplateLiteral') {
    return expression.value;
  }

  const quasis = expression.quasis;
  return expression.expressions
    .reduce(
      (prev, expr, i) => {
        prev.push(stringifyExpression(path, expr), quasis[i + 1].value.cooked);
        return prev;
      },
      [quasis[0].value.cooked]
    )
    .join('');
}

function stringifyIdentifier(path, expression) {
  const binding = path.scope.getBinding(expression.name);
  if (binding) {
    const initPath = binding.path.get('init');

    if (initPath.node) {
      return stringifyExpression(initPath, initPath.node);
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

function stringifyUnaryExpression(path, expression) {
  const value = stringifyExpression(path, expression.argument);
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

function stringifyBinaryExpression(path, expression) {
  const left = stringifyExpression(path, expression.left);
  const right = stringifyExpression(path, expression.right);
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

function stringifyArrayExpression(path, expression) {
  return expression.elements.map(prop => stringifyExpression(path, prop));
}

module.exports = stringifyExpression;
