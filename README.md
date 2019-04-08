babel-plugin-glsl
====================

[![npm version](https://badge.fury.io/js/babel-plugin-glsl.svg)](https://badge.fury.io/js/babel-plugin-glsl)
[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)
[![Babel Macro](https://img.shields.io/badge/babel--macro-%F0%9F%8E%A3-f5da55.svg?style=flat-square)](https://github.com/kentcdodds/babel-plugin-macros)

A [Babel](https://babeljs.io/) plugin to process GLSL code with [glslify](https://github.com/glslify/glslify), a module system for GLSL.

# Example

### In

```js
import glsl from 'glslify';

const frag = glsl`
  #pragma glslify: random = require(glsl-random)

  void main () {
    float brightness = random(gl_FragCoord.xy / resolution.xy);
    gl_FragColor = vec4(vec3(brightness), 1.0);
  }
`;
```

### Out

```js
const frag = `
  highp float random(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = dot(co.xy, vec2(a,b));
    highp float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
  }

  void main () {
    float brightness = random(gl_FragCoord.xy / resolution.xy);
    gl_FragColor = vec4(vec3(brightness), 1.0);
  }
`;
```

# Installation

```bash
# yarn
yarn add -D glslify babel-plugin-glsl

# npm
npm i --save-dev glslify babel-plugin-glsl
```

# Usage

Add the plugin to your `.babelrc`

```json
{
  "plugins": ["glsl"]
}
```

Please note that the Babel plugin should run before other plugins or presets to ensure the template literals are correctly transformed.

Alternatively, instead of using the Babel plugin, you can use this package with [babel-plugin-macros](https://github.com/kentcdodds/babel-plugin-macros/). After installing `babel-plugin-macros` and adding it to your Babel config, you can use the transform directly with:

```js
import glsl from 'babel-plugin-glsl/macro';

const frag = glsl`
  // ...
`;
```

# Features

## Inlined constants

Constants are inlined at compile time and the result is processed by Glslify

### In

```js
const ALPHA = 1;

const frag = glsl`
  void main () {
    gl_FragColor = vec4(1, 0, 0, ${ALPHA});
  }
`;
```

### Out

```js
const ALPHA = 1;

const frag = glsl`
  void main () {
    gl_FragColor = vec4(1, 0, 0, 1);
  }
`;
```

## Dynamic expressions

Expressions that can't be inlined remain and the surrounding code is processed by Glslify in parts. This imposes the limitation that the parts on either side of the expression should be valid GLSL or compilation is likely to fail. It's probably best to place dynamic expressions as a `#define` and use that in the rest of the shader. 

### In and out

```js
function createShader(alpha)
  return glsl`
    #define ALPHA ${alpha}
    void main () {
      gl_FragColor = vec4(1, 0, 0, ALPHA);
    }
  `;
}
```

## Glslify transforms

Shader transforms like [glslify-hex](http://stack.gl/packages/#hughsk/glslify-hex) and [glslify-import](http://stack.gl/packages/#hughsk/glslify-import) can be used.

### In

Install the transforms and add them to your package.json

```json
// package.json
"glslify": {
  "transform": [
    "glslify-hex",
    "glslify-import"
  ]
}
```

```glsl
// defines.glsl
#define PI 3.141592653589793
```

```js
const frag = glsl`
  #pragma glslify: import(./defines)
  void main () {
    gl_FragColor = vec4(#ff0000, 1);
  }
`;
```

### Out 

```js
const frag = glsl`
  #define PI 3.141592653589793
  void main () {
    gl_FragColor = vec4(vec3(1,0,0), 1);
  }
`;
```

## Imported function names

Glslify changes function names to avoid clashes. This is an issue if you write your shader in multiple parts.

### Example of the problem

```js
const shader = {
  fragPars: glsl`
    #pragma glslify: random = require(glsl-random)
  `,
  fragMain: glsl`
    float brightness = random(gl_FragCoord.xy / resolution.xy);
    gl_FragColor = vec4(vec3(brightness), 1.0);
  `
}
```

turns into

```js
const shader = {
  fragPars: glsl`
    highp float random_0(vec2 co) {
      highp float a = 12.9898;
      highp float b = 78.233;
      highp float c = 43758.5453;
      highp float dt = dot(co.xy, vec2(a,b));
      highp float sn = mod(dt, 3.14);
      return fract(sin(sn) * c);
    }
  `,
  fragMain: glsl`
    float brightness = random(gl_FragCoord.xy / resolution.xy);
    gl_FragColor = vec4(vec3(brightness), 1.0);
  `
}
```

> `random_0` doesn't match `random`

This plugin does rename some functions to avoid clashes (like functions referenced inside of imports), but not ones that you import.

# Inspiration

* [glslify](https://github.com/glslify/glslify)
* [babel-plugin-glslify](https://github.com/glslify/babel-plugin-glslify)
