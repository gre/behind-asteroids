attribute vec2 p;
varying vec2 uv;
varying vec2 guv;

// This will be hardcoded later
uniform vec2 dim;
uniform float game_margin;

void main() {
  gl_Position = vec4(p,0.0,1.0);
  uv = 0.5 * (p+1.0);
  guv = (uv * (dim+vec2(2.0 * game_margin)) - vec2(game_margin)) / (dim);
}
