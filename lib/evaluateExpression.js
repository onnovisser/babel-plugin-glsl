const { types: t, transformFileSync } = require('@babel/core');
const nodePath = require('path');

function evaluateExpression(path, expression, env) {
  const evaluateFns = [
    [t.isLiteral, evaluateLiteral],
    [t.isIdentifier, evaluateIdentifier],
    [t.isMemberExpression, evaluateMemberExpression],
    [t.isUnaryExpression, evaluateUnaryExpression],
    [t.isBinaryExpression, evaluateBinaryExpression],
    [t.isLogicalExpression, evaluateBinaryExpression],
    [t.isArrayExpression, evaluateArrayExpression],
    [t.isObjectExpression, evaluateObjectExpression],
  ];

  for (let i = 0; i < evaluateFns.length; i++) {
    const [test, fn] = evaluateFns[i];
    if (test(expression)) return fn(path, expression, env);
  }

  throw new Error(
    `babel-plugin-glsl: cannot evaluate expression of type "${expression.type}"`
  );
}

function evaluateLiteral(path, expression, env) {
  if (expression.type !== 'TemplateLiteral') {
    return expression.value;
  }

  const quasis = expression.quasis;
  const literals = [quasis[0].value.cooked];
  const expressions = [];
  let offset = 0;
  expression.expressions.forEach((expr, i) => {
    const val = evaluateExpression(path, expr, env);
    if (isPrimitive(val) || Array.isArray(val)) {
      literals[offset] = (literals[offset] || '').concat(
        val,
        quasis[i + 1].value.cooked
      );
    } else {
      expressions[offset] = val;
      offset++;
      literals[offset] = quasis[i + 1].value.cooked;
    }
  });

  if (expressions.length === 0) {
    return literals[0];
  }

  return t.templateLiteral(
    literals.map(l => t.templateElement({ raw: l })),
    expressions
  );
}

function evaluateIdentifier(path, expression, env) {
  const binding = path.scope.getBinding(expression.name);
  if (binding) {
    if (binding.kind === 'module') {
      return evaluateImport(binding.path, env);
    }
    if (binding.kind === 'param' || binding.constant === false) {
      return expression;
    }

    const initPath = binding.path.get('init');
    if (initPath.node) {
      return evaluateExpression(initPath, initPath.node, env);
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

function evaluateImport(importPath, env) {
  const src = importPath.parent.source.value;
  const importedFile = require.resolve(nodePath.resolve(env.cwd, src));
  const isDefault = t.isImportDefaultSpecifier(importPath);
  let value;
  transformFileSync(importedFile, {
    plugins: [
      () => {
        let exprToevaluate;
        return {
          visitor: {
            ExportNamedDeclaration(path) {
              if (isDefault) return;
              const { name } = importPath.node.imported;
              path.node.specifiers.forEach(specifier => {
                if (specifier.exported.name === name) {
                  exprToevaluate = specifier.local;
                }
              });
            },
            ExportDefaultDeclaration(path) {
              if (!isDefault) return;
              exprToevaluate = path.node.declaration;
            },
            Program: {
              exit(path) {
                if (!exprToevaluate) {
                  throw new Error(
                    `babel-plugin-glsl: cannot resolve glslify() call, import "${
                      importPath.node.local.name
                    }" not exported by "${src}"`
                  );
                }
                value = evaluateExpression(path, exprToevaluate);
              },
            },
          },
        };
      },
    ],
  });
  return value;
}

function evaluateMemberExpression(path, expression, env) {
  const { property, object, computed } = expression;

  if (['window', 'globalThis'].includes(object.name)) return expression;
  const objectValue =
    object.name === 'Math' ? Math : evaluateExpression(path, object, env);

  if (t.isIdentifier(objectValue)) return expression;

  const propertyValue = getPathPropertyValue();

  return objectValue[propertyValue];

  function getPathPropertyValue() {
    if (property.type === 'Identifier' && computed) {
      return evaluateExpression(path, property);
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

function evaluateUnaryExpression(path, expression, env) {
  const value = evaluateExpression(path, expression.argument, env);

  if (t.isIdentifier(value)) return expression;

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

function evaluateBinaryExpression(path, expression, env) {
  const left = evaluateExpression(path, expression.left, env);
  const right = evaluateExpression(path, expression.right, env);

  if (t.isIdentifier(left) || t.isIdentifier(right)) return expression;

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

function evaluateArrayExpression(path, expression, env) {
  return expression.elements.map(prop => evaluateExpression(path, prop, env));
}

function evaluateObjectExpression(path, expression, babel) {
  return expression.properties.reduce((result, property) => {
    if (property.type !== 'ObjectProperty') {
      throw new Error('babel-plugin-glsl: expected object property');
    }

    const value = evaluateExpression(path, property.value, babel);
    const key = property.key;
    if (key.type === 'Identifier') {
      result[key.name] = value;
    } else if (key.type === 'StringLiteral') {
      result[key.value] = value;
    } else {
      throw new Error('babel-plugin-glsl: invalid property type');
    }
    return result;
  }, {});
}

function isPrimitive(val) {
  return val == null || /^[sbn]/.test(typeof val);
}

module.exports = evaluateExpression;
