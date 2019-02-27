const { types: t, transformFileSync } = require('@babel/core');
const nodePath = require('path');

function stringifyExpression(path, expression, env) {
  const stringifyFns = [
    [t.isLiteral, stringifyLiteral],
    [t.isIdentifier, stringifyIdentifier],
    [t.isMemberExpression, stringifyMemberExpression],
    [t.isUnaryExpression, stringifyUnaryExpression],
    [t.isBinaryExpression, stringifyBinaryExpression],
    [t.isArrayExpression, stringifyArrayExpression],
  ];

  for (let i = 0; i < stringifyFns.length; i++) {
    const [test, fn] = stringifyFns[i];
    if (test(expression)) return fn(path, expression, env);
  }

  throw new Error(
    `babel-plugin-glsl: cannot stringify expression of type "${
      expression.type
    }"`
  );
}

function stringifyLiteral(path, expression, env) {
  if (expression.type !== 'TemplateLiteral') {
    return expression.value;
  }

  const quasis = expression.quasis;
  return expression.expressions
    .reduce(
      (prev, expr, i) => {
        prev.push(
          stringifyExpression(path, expr, env),
          quasis[i + 1].value.cooked
        );
        return prev;
      },
      [quasis[0].value.cooked]
    )
    .join('');
}

function stringifyIdentifier(path, expression, env) {
  const binding = path.scope.getBinding(expression.name);
  if (binding) {
    if (binding.kind === 'module') {
      return stringifyImport(binding.path, env);
    }
    const initPath = binding.path.get('init');

    if (initPath.node) {
      return stringifyExpression(initPath, initPath.node, env);
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

function stringifyImport(importPath, env) {
  const importedFile = nodePath.resolve(
    env.cwd,
    // TODO: support any extension and import style
    `${importPath.parent.source.value}.js`
  );

  const isDefault = t.isImportDefaultSpecifier(importPath);
  let value;
  transformFileSync(importedFile, {
    plugins: [
      () => {
        let pathToStringify;
        let exprToStringify;
        return {
          visitor: {
            ExportNamedDeclaration(path) {
              if (isDefault) return;
              const { name } = importPath.node.imported;
              path.node.specifiers.forEach(specifier => {
                if (specifier.exported.name === name) {
                  pathToStringify = path;
                  exprToStringify = specifier.local;
                }
              })
            },
            ExportDefaultDeclaration(path) {
              if (!isDefault) return;
              pathToStringify = path;
              exprToStringify = path.node.declaration;
            },
            Program: {
              exit() {
                value = stringifyExpression(pathToStringify, exprToStringify);
              },
            },
          },
        };
      },
    ],
  });
  return value;
}

function stringifyMemberExpression(path, expression, env) {
  const { property, object, computed } = expression;
  const objectValue = stringifyExpression(path, object, env);
  const propertyValue = getPathPropertyValue();

  return objectValue[propertyValue];

  function getPathPropertyValue() {
    if (property.type === 'Identifier' && computed) {
      return stringifyExpression(path, property);
    } else {
      return getLiteralPropertyValue(property);
    }
  }

  function getLiteralPropertyValue(node) {
    if (t.isLiteral(node)) {
      return node.value;
    } else if (t.isIdentifier(node)) {
      return node.name;
    } else {
      throw new Error(
        `babel-plugin-glsl: ${node.type} is not supported in MemberExpression`
      );
    }
  }
}

function stringifyUnaryExpression(path, expression, env) {
  const value = stringifyExpression(path, expression.argument, env);
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

function stringifyBinaryExpression(path, expression, env) {
  const left = stringifyExpression(path, expression.left, env);
  const right = stringifyExpression(path, expression.right, env);
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

function stringifyArrayExpression(path, expression, env) {
  return expression.elements.map(prop => stringifyExpression(path, prop, env));
}

module.exports = stringifyExpression;
