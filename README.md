# babel-plugin-glsl

A [Babel](https://babeljs.io/) plugin to process GLSL code with [glslify](https://github.com/glslify/glslify), a module system for GLSL.

## Example

### In

```js
import glsl from 'glslify';

const fragmentShader = glsl`
  #pragma glslify: random = require(glsl-random)

  void main () {
    float brightness = random(gl_FragCoord.xy / resolution.xy);
    gl_FragColor = vec4(vec3(brightness), 1.0);
  }
`;
```

### Out

```js
const fragmentShader = `
  #define GLSLIFY 1

  highp float random(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy, vec2(a,b));
    highp float sn= mod(dt, 3.14);
    return fract(sin(sn) * c);
  }

  void main () {
    float brightness = random(gl_FragCoord.xy / resolution.xy);
    gl_FragColor = vec4(vec3(brightness), 1.0);
  }
`;
```

## Installation

```bash
# yarn
yarn add -D glslify babel-plugin-glsl

# npm
npm i --save-dev glslify babel-plugin-glsl
```

## Usage

Add the plugin to your `.babelrc`

```json
{
  "plugins": ["babel-plugin-glsl"]
}
```

Or use it directly with [babel-plugin-macros](https://github.com/kentcdodds/babel-plugin-macros/)

```js
import glsl from 'babel-plugin-glsl/macro';

const fragmentShader = glsl`
  // ...
`;
```
