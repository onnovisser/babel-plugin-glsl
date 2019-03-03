/**
 * Mostly taken from https://github.com/glslify/glslify-bundle
 * It does the same, with the exception of not "descoping" identifiers in the entry chunk
 */

const hash = require('murmurhash-js/murmurhash3_gc');
const trim = require('glsl-token-whitespace-trim');
const tokenize = require('glsl-tokenizer/string');
const defines = require('glsl-token-defines');
const descope = require('glsl-token-descope');
const string = require('glsl-token-string');
const scope = require('glsl-token-scope');
const depth = require('glsl-token-depth');
const topoSort = require('glslify-bundle/lib/topo-sort');
const copy = require('shallow-copy');

function bundle(deps) {
  deps = topoSort(deps);
  const depIndex = indexBy(deps, 'id');
  const src = [];

  for (let i = 0; i < deps.length; i++) {
    preprocess(deps[i], depIndex);
  }

  for (let i = 0; i < deps.length; i++) {
    if (deps[i].entry) {
      src.push(...bundleDeps(deps[i]));
    }
  }

  return string(trim(src));
}

function preprocess(dep, depIndex) {
  const tokens = tokenize(dep.source);
  const imports = [];
  let exports = null;

  depth(tokens);
  scope(tokens);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== 'preprocessor') continue;
    if (!glslifyPreprocessor(token.data)) continue;

    const exported = glslifyExport(token.data);
    const imported = glslifyImport(token.data);

    if (exported) {
      exports = exported[1];
      tokens.splice(i--, 1);
    } else if (imported) {
      const name = imported[1];
      const maps = imported[2].split(/\s?,\s?/g);
      const path = maps
        .shift()
        .trim()
        .replace(/^'|'$/g, '')
        .replace(/^"|"$/g, '');
      const target = depIndex[dep.deps[path]];
      imports.push({
        name: name,
        path: path,
        target: target,
        maps: toMapping(maps),
        index: i,
      });
      tokens.splice(i--, 1);
    }
  }

  const eof = tokens[tokens.length - 1];
  if (eof && eof.type === 'eof') {
    tokens.pop();
  }

  if (dep.entry) {
    exports = exports || 'main';
  }

  if (!exports) {
    throw new Error(`${dep.file} does not export any symbols`);
  }

  dep.parsed = {
    tokens: tokens,
    imports: imports,
    exports: exports,
  };
}

function bundleDeps(entry) {
  const resolved = {};
  const postRename = {};
  const bundled = resolve(entry, [])[1];

  const result = descope(bundled, local => {
    return postRename[local] || local;
  });

  return result;

  function resolve(dep, bindings) {
    // Compute suffix for module
    // More rigorous hash than glslify does,
    // because compiled entry chunks could end up in the same shader
    bindings.sort();
    const ident = bindings.join(':') + ':' + dep.id + entry.source;
    let suffix = '_' + hash(ident);

    if (dep.entry) {
      suffix = '';
    }

    // Test if export is already resolved
    const exportName = dep.parsed.exports + suffix;
    if (resolved[exportName]) {
      return [exportName, []];
    }

    // Initialize map for variable renamings based on bindings
    const rename = {};
    for (let i = 0; i < bindings.length; ++i) {
      const binding = bindings[i];
      rename[binding[0]] = binding[1];
    }

    // Resolve all dependencies
    const imports = dep.parsed.imports;
    const edits = [];
    for (let i = 0; i < imports.length; ++i) {
      const data = imports[i];

      const importMaps = data.maps;
      const importName = data.name;
      const importTarget = data.target;

      const importBindings = Object.keys(importMaps).map(id => {
        const value = importMaps[id];

        // floats/ints should not be renamed
        if (value.match(/^\d+(?:\.\d+?)?$/g)) {
          return [id, value];
        }

        // properties (uVec.x, ray.origin, ray.origin.xy etc.) should
        // have their host identifiers renamed
        const parent = value.match(/^([^.]+)\.(.+)$/);
        if (parent) {
          return [
            id,
            (rename[parent[1]] || parent[1] + suffix) + '.' + parent[2],
          ];
        }

        return [id, rename[value] || value + suffix];
      });

      const importTokens = resolve(importTarget, importBindings);

      // Let imports be renamed to a hashed version
      // Rename toplevel imports again at the end
      if (dep.entry) {
        postRename[importTokens[0]] = importName;
      }
      rename[importName] = importTokens[0];

      edits.push([data.index, importTokens[1]]);
    }

    // Rename tokens
    const parsedTokens = dep.parsed.tokens.map(copy);
    const parsedDefs = defines(parsedTokens);
    let tokens = descope(parsedTokens, local => {
      if (parsedDefs[local]) return local;
      if (rename[local]) return rename[local];

      return local + suffix;
    });

    // Insert edits
    edits.sort((a, b) => b[0] - a[0]);

    for (let i = 0; i < edits.length; ++i) {
      const edit = edits[i];
      tokens = tokens
        .slice(0, edit[0])
        .concat(edit[1])
        .concat(tokens.slice(edit[0]));
    }

    resolved[exportName] = true;
    return [exportName, tokens];
  }
}

function glslifyPreprocessor(data) {
  return /#pragma glslify:/.test(data);
}

function glslifyExport(data) {
  return /#pragma glslify:\s*export\(([^)]+)\)/.exec(data);
}

function glslifyImport(data) {
  return /#pragma glslify:\s*([^=\s]+)\s*=\s*require\(([^)]+)\)/.exec(data);
}

function indexBy(deps, key) {
  return deps.reduce((deps, entry) => {
    deps[entry[key]] = entry;
    return deps;
  }, {});
}

function toMapping(maps) {
  if (!maps) return false;

  return maps.reduce((mapping, defn) => {
    defn = defn.split(/\s?=\s?/g);

    const expr = defn.pop();

    defn.forEach(key => {
      mapping[key] = expr;
    });

    return mapping;
  }, {});
}

module.exports = bundle;
