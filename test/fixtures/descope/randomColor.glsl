#pragma glslify: random = require(./rand)

float rand() {
  return 0.87;
}

vec3 randomColor() {
  return vec3(rand(), random(), rand());
}

#pragma glslify: export(randomColor)
