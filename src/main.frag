precision highp float;

varying vec2 uv;
varying vec2 guv;
uniform sampler2D game;
uniform sampler2D ui;
uniform sampler2D player;

void main() {
  float scr =
    step(0.0, guv.x) *
    step(0.0, guv.y) *
    step(guv.x, 1.0) *
    step(guv.y, 1.0);

  vec4 cg = scr *
    texture2D(game, guv);

  vec4 pl = scr *
    texture2D(player, guv);

  vec4 cui = texture2D(ui, uv);

  gl_FragColor = vec4(mix(cg.rgb + 0.4 * pl.rgb, cui.rgb, cui.a), 1.0);
}
