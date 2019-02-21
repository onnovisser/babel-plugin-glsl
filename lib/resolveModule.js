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
    const children = declaration.declarations;
    for (let i = 0; i < children.length; ++i) {
      if (children[i].id === identifier) {
        const rhs = children[i].init;
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
  const binding = path.scope.getBinding(name);
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

module.exports = resolveModule;
