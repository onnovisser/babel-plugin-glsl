const { types: t, transformFileSync } = require('@babel/core');
const nodePath = require('path');

function stringifyExpression(path, expression, env) {
  const stringifyFns = [
    [t.isLiteral, stringifyLiteral],
    [t.isIdentifier, stringifyIdentifier],
    [t.isMemberExpression, stringifyMemberExpression],
    [t.isUnaryExpression, stringifyUnaryExpression],
    [t.isBinaryExpression, stringifyBinaryExpression],
    [t.isLogicalExpression, stringifyBinaryExpression],
    [t.isArrayExpression, stringifyArrayExpression],
    [t.isObjectExpression, stringifyObjectExpression],
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
  const literals = [quasis[0].value.cooked];
  const expressions = [];
  let offset = 0;
  expression.expressions.forEach((expr, i) => {
    const val = stringifyExpression(path, expr, env);
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

function stringifyIdentifier(path, expression, env) {
  const binding = path.scope.getBinding(expression.name);
  if (binding) {
    if (binding.kind === 'module') {
      return stringifyImport(binding.path, env);
    }
    if (binding.kind === 'param') {
      return expression;
    }

    if (binding.constant === false) {
      throw new Error(
        `babel-plugin-glsl: identifier "${expression.name}" is not constant`
      );
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
  const src = importPath.parent.source.value;
  const importedFile = nodePath.resolve(
    env.cwd,
    // TODO: support any extension and import style
    `${src}.js`
  );

  const isDefault = t.isImportDefaultSpecifier(importPath);
  let value;
  transformFileSync(importedFile, {
    plugins: [
      () => {
        let exprToStringify;
        return {
          visitor: {
            ExportNamedDeclaration(path) {
              if (isDefault) return;
              const { name } = importPath.node.imported;
              path.node.specifiers.forEach(specifier => {
                if (specifier.exported.name === name) {
                  exprToStringify = specifier.local;
                }
              });
            },
            ExportDefaultDeclaration(path) {
              if (!isDefault) return;
              exprToStringify = path.node.declaration;
            },
            Program: {
              exit(path) {
                if (!exprToStringify) {
                  throw new Error(
                    `babel-plugin-glsl: cannot resolve glslify() call, import "${
                      importPath.node.local.name
                    }" not exported by "${src}"`
                  );
                }
                value = stringifyExpression(path, exprToStringify);
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

  if (t.isIdentifier(objectValue)) return expression;

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

function stringifyBinaryExpression(path, expression, env) {
  const left = stringifyExpression(path, expression.left, env);
  const right = stringifyExpression(path, expression.right, env);

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

function stringifyArrayExpression(path, expression, env) {
  return expression.elements.map(prop => stringifyExpression(path, prop, env));
}

function stringifyObjectExpression(path, expression, babel) {
  return expression.properties.reduce((result, property) => {
    if (property.type !== 'ObjectProperty') {
      throw new Error('babel-plugin-glsl: expected object property');
    }

    const value = stringifyExpression(path, property.value, babel);
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

module.exports = stringifyExpression;
