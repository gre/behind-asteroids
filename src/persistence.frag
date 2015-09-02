precision highp float;

varying vec2 uv;
uniform sampler2D t;
uniform sampler2D r;

void main() {
  vec3 b = texture2D(r, uv).rgb;
  gl_FragColor = vec4(
    b * (0.7 - 0.2 * pow(b.r, 3.0)) +
    texture2D(t, uv).rgb,
    1.0);
}
