/* global c g d u MOBILE
gameScale: true
glCreateFBO glCreateShader glCreateTexture glUniformLocation
STATIC_VERT
BLUR1D_FRAG
COPY_FRAG
GAME_FRAG
GLARE_FRAG
LASER_FRAG
PERSISTENCE_FRAG
PLAYER_FRAG
*/

var gl = c.getContext("webgl") || c.getContext("experimental-webgl"),
  ctx,
  gameCtx = g.getContext("2d"),
  uiCtx = u.getContext("2d"),
  FW = MOBILE ? 480 : 800,
  FH = MOBILE ? 660 : 680,
  GAME_MARGIN = MOBILE ? 50 : 120,
  GAME_Y_MARGIN = MOBILE ? 140 : GAME_MARGIN,
  GAME_INC_PADDING = MOBILE ? 40 : 80,
  W = FW - 2 * GAME_MARGIN,
  H = FH - 2 * GAME_Y_MARGIN,
  borderLength = 2*(W+H+2*GAME_INC_PADDING),
  SEED = Math.random();

// DOM setup

d.style.webkitTransformOrigin = d.style.transformOrigin = "0 0";

g.width = c.width = W;
g.height = c.height = H;
c.style.top = GAME_Y_MARGIN + "px";
c.style.left = GAME_MARGIN + "px";

var uiScale = MOBILE ? 1 : devicePixelRatio; // MOBILE is just too slow to do devicePixelRatio..
u.width = FW * uiScale;
u.height = FH * uiScale;
u.style.width = FW + "px";
u.style.height = FH + "px";

var lastW = 0, lastH = 0;
function checkSize () {
  var ww = window.innerWidth, wh = window.innerHeight;
  if (ww == lastW && wh == lastH) return;
  lastW = ww;
  lastH = wh;
  var scaleX = FW / ww;
  var scaleY = (FH+20) / wh;
  gameScale = 1/Math.max(scaleX, scaleY);
  if (!MOBILE && gameScale > 1) gameScale = 1;
  d.style.webkitTransform = d.style.transform = "scale("+gameScale+")";
  d.style.top = Math.max(10, Math.floor((wh - (FH+20)*gameScale)/2))+"px";
  d.style.left = Math.max(0, Math.floor((ww - FW*gameScale)/2))+"px";
}


// WebGL setup

gl.viewport(0, 0, W, H);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

var buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1.0, -1.0,
  1.0, -1.0,
  -1.0,  1.0,
  -1.0,  1.0,
  1.0, -1.0,
  1.0,  1.0
]), gl.STATIC_DRAW);

var blur1dShader = glCreateShader(STATIC_VERT, BLUR1D_FRAG);
gl.uniform2f(glUniformLocation(blur1dShader, "dim"), W, H);
var copyShader = glCreateShader(STATIC_VERT, COPY_FRAG);
var laserShader = glCreateShader( STATIC_VERT, LASER_FRAG);
var persistenceShader = glCreateShader(STATIC_VERT, PERSISTENCE_FRAG);
var glareShader = glCreateShader(STATIC_VERT, GLARE_FRAG);
var playerShader = glCreateShader(STATIC_VERT, PLAYER_FRAG);
gl.uniform1f(glUniformLocation(playerShader, "S"), SEED);
var gameShader = glCreateShader(STATIC_VERT, GAME_FRAG);

var persistenceFbo = glCreateFBO();
var playerFbo = glCreateFBO();
var glareFbo = glCreateFBO();
var laserFbo = glCreateFBO();
var fbo1 = glCreateFBO();
var fbo2 = glCreateFBO();

var textureGame = glCreateTexture();
