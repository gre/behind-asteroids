precision highp float;

varying vec2 uv;
uniform sampler2D t;

void main() {
  gl_FragColor = vec4(pow(texture2D(t, uv).r, 2.0));
}
