precision highp float;

varying vec2 uv;
uniform sampler2D t;

void main() {
  vec3 c = texture2D(t, uv).rgb;
  vec2 off = 0.003 * vec2(
    cos(47.0 * uv.y),
    sin(67.0 * uv.x)
  );
  float r = c.r + c.g + c.b + texture2D(t, uv+off).b;
  gl_FragColor = vec4(vec3(r), 1.0);
}
