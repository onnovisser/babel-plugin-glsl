const glslifyBundle = require('./bundle');
const glslifyDeps = require('glslify-deps/sync');
const nodeResolve = require('resolve');

module.exports = function(src, opts) {
  return iface().compile(src, opts);
};

function iface() {
  const basedir = process.cwd();
  const posts = [];
  return { compile };

  function compile(src, opts = {}) {
    const depper = gdeps(opts);
    const deps = depper.inline(src, opts.basedir || basedir);
    return bundle(deps);
  }
  function gdeps(opts) {
    if (!opts) opts = {};
    const depper = glslifyDeps({ cwd: opts.basedir || basedir });
    let transforms = opts.transform || [];
    transforms = Array.isArray(transforms) ? transforms : [transforms];
    transforms.forEach(transform => {
      transform = Array.isArray(transform) ? transform : [transform];
      const name = transform[0];
      const opts = transform[1] || {};
      if (opts.post) {
        posts.push({ name: name, opts: opts });
      } else {
        depper.transform(name, opts);
      }
    });
    return depper;
  }
  function bundle(deps) {
    const source = glslifyBundle(deps);
    posts.forEach(tr => {
      let transform;
      if (typeof tr.name === 'function') {
        transform = tr.name;
      } else {
        const target = nodeResolve.sync(tr.name, { basedir: basedir });
        transform = require(target);
      }
      const src = transform((deps && deps[0] && deps[0].file) || null, source, {
        post: true,
      });
      if (src) source = src;
    });
    return source;
  }
}
