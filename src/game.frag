precision highp float;

varying vec2 uv;
uniform sampler2D g; // game
uniform sampler2D r; // persistence
uniform sampler2D b; // blur
uniform sampler2D l; // glare
uniform sampler2D e; // env (player)
uniform float s; // starting

void main() {
  gl_FragColor = vec4(
    s * texture2D(l, uv).rgb +
    s * (texture2D(r, uv).rgb + 3.0 * texture2D(b, uv).rgb) * vec3(0.3, 0.6, 1.0) +
    mix(1.0, 2.0, s) * texture2D(g, uv).rgb +
    s * 0.5 * texture2D(e, uv).rgb
  , 1.0);
}
