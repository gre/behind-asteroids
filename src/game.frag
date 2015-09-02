precision highp float;

varying vec2 uv;
uniform sampler2D g; // game
uniform sampler2D r; // persistence
uniform sampler2D b; // blur
uniform sampler2D l; // glare
uniform sampler2D e; // env (player)

void main() {
  gl_FragColor = vec4(
    texture2D(l, uv).rgb +
    (texture2D(r, uv).rgb + 2.0 * texture2D(b, uv).rgb) * vec3(0.3, 0.6, 1.0) +
    texture2D(g, uv).rgb +
    0.5 * texture2D(e, uv).rgb
  , 1.0);
}
