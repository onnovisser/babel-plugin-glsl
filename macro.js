const { createMacro, MacroError } = require('babel-plugin-macros');
const processGlslTag = require('./lib/processGlslTag');

function glslifyMacro({ references, state, babel }) {
  const { default: defaultImport = [] } = references;

  defaultImport.forEach(referencePath => {
    const path = referencePath.parentPath;
    if (path.type === 'TaggedTemplateExpression') {
      try {
        processGlslTag(path, state, babel);
      } catch(e) {
        throw new MacroError(e.message);
      }
    } else {
      throw new MacroError(`${referencePath}`);
    }
  });
}

module.exports = createMacro(glslifyMacro);
