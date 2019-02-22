const resolveModule = require('./lib/resolveModule');
const processGlslTag = require('./lib/processGlslTag');

function transform() {
  return {
    name: 'glslify',
    visitor: {
      TaggedTemplateExpression(path, state) {
        const { tag } = path.node;
        if (
          tag.type !== 'Identifier' ||
          resolveModule(path, tag.name) !== 'glslify'
        ) {
          return;
        }

        try {
          processGlslTag(path, state);
        } catch (e) {
          throw path.buildCodeFrameError(e.message);
        }
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
}

module.exports = transform;
