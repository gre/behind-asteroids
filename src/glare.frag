precision highp float;

varying vec2 uv;
uniform sampler2D t;

void main() {
  float c = texture2D(t, uv).r;
  /*
  float intensity = cos(40.0*uv.x) + sin(30.0*uv.y);
  if (c>0.8) {
    c *= (0.6 + 0.4 * intensity);
  }
  */
  gl_FragColor = vec4(pow(c, 4.0));
}
