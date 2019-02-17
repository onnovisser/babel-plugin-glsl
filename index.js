const { dirname } = require('path');
const { evalConstant, resolveModule } = require('./lib/utils');
const compile = require('./lib/compile');

module.exports = function(babel) {
  const { types: t } = babel;

  return {
    name: 'glslify',
    visitor: {
      TaggedTemplateExpression: function(path, state) {
        const { quasi, tag } = path.node;
        if (
          tag.type !== 'Identifier' ||
          resolveModule(path, tag.name) !== 'glslify'
        ) {
          return;
        }

        const cwd = dirname(state.filename);
        const env = {
          cwd,
        };

        const stringInput = evalConstant(env, path, quasi);
        if (typeof stringInput !== 'string') {
          throw new Error(
            'glslify-babel: string template could not be evaluated'
          );
        }

        const result = compile(stringInput, { basedir: cwd });
        path.replaceWith(t.stringLiteral(result));
      },
      Program: {
        exit(programPath) {
          programPath.traverse({
            ImportDeclaration(path) {
              if (path.node.source.value === 'glslify') {
                path.remove();
              }
            },
            // TODO: remove requires
          });
        },
      },
    },
  };
};
