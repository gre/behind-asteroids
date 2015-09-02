precision highp float;

varying vec2 uv;
uniform sampler2D t;
uniform sampler2D back;

void main() {
  vec3 b = texture2D(back, uv).rgb;
  gl_FragColor = vec4(
    b * (0.8 - 0.2 * pow(b.r, 0.5)) +
    texture2D(t, uv).rgb,
    1.0);
}
