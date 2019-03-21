vec4 texture(vec2 p) {
  return texture2D(tex, p - center);
}

#pragma glslify: export(texture)
