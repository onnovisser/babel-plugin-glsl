const bundle = require('./bundle');
const Depper = require('glslify-deps/sync');

const basedir = process.cwd();

function compile(src, opts = {}) {
  const depper = new Depper({ cwd: opts.basedir || basedir });
  const deps = depper.inline(src, opts.basedir || basedir);
  const source = bundle(deps);
  return source;
}

module.exports = compile;
