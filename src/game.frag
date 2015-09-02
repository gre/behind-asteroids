precision highp float;

varying vec2 uv;
uniform sampler2D back;
uniform sampler2D game;
uniform sampler2D blur;
uniform sampler2D glare;

void main() {
  vec3 bac = texture2D(back, uv).rgb;
  vec3 gam = texture2D(game, uv).rgb;
  vec3 blu = texture2D(blur, uv).rgb;
  vec3 gla = texture2D(glare, uv).rgb;

  vec3 c =
    gla +
    (bac + 2.0 * blu) * vec3(0.3, 0.5, 1.0) +
    gam +
    vec3(0.03, 0.04, 0.06);

  gl_FragColor = vec4(c, 1.0);
}
