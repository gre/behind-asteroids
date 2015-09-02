precision highp float;

varying vec2 uv;
uniform sampler2D t;

void main() {
  float c = texture2D(t, uv).r;
  gl_FragColor = vec4(pow(c, 4.0));
}
