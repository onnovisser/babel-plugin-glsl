const { createMacro, MacroError } = require('babel-plugin-macros');
const processGlslTag = require('./lib/processGlslTag');

function glslifyMacro({ references, state, babel }) {
  const t = babel.types;
  const { default: defaultImport = [] } = references;

  defaultImport.forEach(referencePath => {
    const path = referencePath.parentPath;
    if (
      (t.isCallExpression(path.node) &&
        t.isStringLiteral(path.node.arguments[0])) ||
      t.isTaggedTemplateExpression(path.node)) {
      try {
        processGlslTag(path, state);
      } catch (e) {
        throw new MacroError(e.message);
      }
    } else {
      throw new MacroError(`${referencePath}`);
    }
  });
}

module.exports = createMacro(glslifyMacro);
