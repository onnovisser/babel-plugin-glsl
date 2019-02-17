function resolveImport(identifier, declaration) {
  if (
    declaration.type === 'ImportDeclaration' &&
    declaration.source &&
    declaration.source.type === 'StringLiteral'
  ) {
    return declaration.source.value;
  }
  return '';
}

function resolveRequire(path, identifier, declaration) {
  if (declaration.type === 'VariableDeclaration') {
    var children = declaration.declarations;
    for (var i = 0; i < children.length; ++i) {
      if (children[i].id === identifier) {
        var rhs = children[i].init;
        if (
          rhs &&
          rhs.type === 'CallExpression' &&
          rhs.callee.type === 'Identifier' &&
          rhs.callee.name === 'require' &&
          !path.scope.getBinding('require') &&
          rhs.arguments.length === 1 &&
          rhs.arguments[0].type === 'StringLiteral'
        ) {
          return rhs.arguments[0].value;
        }
      }
    }
  }
  return '';
}

function resolveModule(path, name) {
  var binding = path.scope.getBinding(name);
  if (!binding) {
    return '';
  }
  if (!binding.constant) {
    return '';
  }
  switch (binding.kind) {
    case 'module':
      return resolveImport(binding.identifier, binding.path.parent);

    case 'var':
    case 'let':
    case 'const':
      return resolveRequire(path, binding.identifier, binding.path.parent);

    default:
      return '';
  }
}

function evalConstant(env, path, expression) {
  if (!expression) {
    throw new Error('glslify-binding: invalid expression');
  }
  switch (expression.type) {
    case 'StringLiteral':
    case 'BooleanLiteral':
    case 'NumericLiteral':
    case 'NullLiteral':
      return expression.value;
    case 'TemplateLiteral':
      const quasis = expression.quasis;
      return expression.expressions
        .reduce(
          (prev, expr, i) => {
            prev.push(
              evalConstant(env, path, expr),
              quasis[i + 1].value.cooked
            );
            return prev;
          },
          [quasis[0].value.cooked]
        )
        .join('');
    case 'Identifier':
      // TODO: handle other constants here
      const binding = path.scope.getBinding(expression.name);
      if (!binding) {
        if (expression.name === '__dirname') {
          return env.cwd;
        }
      }
      throw new Error(
        `glslify-babel: cannot resolve glslify(), unknown reference "${
          expression.name
        }"`
      );
    case 'UnaryExpression':
      const value = evalConstant(env, path, expression.argument);
      // prettier-ignore
      switch (expression.operator) {
          case '+': return +value
          case '-': return -value
          case '!': return !value
          case '~': return ~value
          case 'typeof': return typeof value
          case 'void': return void value
        }
      throw new Error('glslify-babel: unsupported unary operator');
    case 'BinaryExpression':
      const left = evalConstant(env, path, expression.left);
      const right = evalConstant(env, path, expression.right);
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
      throw new Error('glslify-babel: unsupported binary expression');
    case 'ObjectExpression':
      return expression.properties.reduce((result, property) => {
        if (property.type !== 'ObjectProperty') {
          throw new Error('glslify-babel: expected object property');
        }

        const value = evalConstant(env, path, property.value);
        const key = property.key;
        if (key.type === 'Identifier') {
          result[key.name] = value;
        } else if (key.type === 'StringLiteral') {
          result[key.value] = value;
        } else {
          throw new Error('glslify-babel: invalid property type');
        }
        return result;
      }, {});
    case 'ArrayExpression':
      return expression.elements.map(prop => {
        if (!prop) {
          return null;
        }
        return evalConstant(env, path, prop);
      });
    default:
      throw new Error('glslify-babel: cannot resolve glslify() call');
  }
}

module.exports = {
  resolveImport,
  resolveRequire,
  resolveModule,
  evalConstant,
};
