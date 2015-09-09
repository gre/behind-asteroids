precision highp float;

varying vec2 uv;
uniform sampler2D G; // game
uniform sampler2D R; // persistence
uniform sampler2D B; // blur
uniform sampler2D L; // glare
uniform sampler2D E; // env (player)
uniform float s; // starting

float squircleDist (vec2 a, vec2 b) {
  float p = 10.0;
  vec2 c = a-b;
  return pow(abs(pow(abs(c.x), p)+pow(abs(c.y), p)), 1.0/p);
}

void main() {
  vec2 pos = (uv/0.98)-0.01;
  float d = squircleDist(uv, vec2(0.5));
  float dd = smoothstep(0.45, 0.51, d);
  pos = mix(pos, vec2(0.5), 0.2 * (0.6 - d) - 0.02 * d);

  gl_FragColor = vec4((
    vec3(0.03, 0.04, 0.05) +
    mix(0.5, 2.0, s) * texture2D(G, pos).rgb +
    s * (
      texture2D(L, pos).rgb +
      vec3(0.3, 0.6, 1.0) * (
        texture2D(R, pos).rgb +
        3.0 * texture2D(B, pos).rgb
      ) +
      0.5 * texture2D(E, pos).rgb
    )
  )
  * mix(1.0, smoothstep(1.0, 0.0, dd), 0.6), 1.0);
}
