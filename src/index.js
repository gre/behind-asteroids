/* TODO list
- ai
  - make a very good AI
  - tweak this AI to make variant of difficulty (based on player number)
- audio
- js13k
  - rename the glsl uniforms to 1-3 chars
  - convert WebGL the code into standalone
  - connect the build tools
  - optim the code
- game features (if time)
*/

// Constants
var gl = c.getContext("webgl"),
  FW = 800,
  FH = 680,
  SEED = Math.random(),
  raf = requestAnimationFrame,
  GAME_MARGIN = 120,
  GAME_INC_PADDING = 80,
  W = FW - 2 * GAME_MARGIN,
  H = FH - 2 * GAME_MARGIN,
  borderLength = 2*(W+H+2*GAME_INC_PADDING);

d.style.width = FW+"px";

c.width = W;
c.height = H;
c.style.top = GAME_MARGIN + "px";
c.style.left = GAME_MARGIN + "px";

// Temporary external libs
var createFBO = require("gl-fbo");
var createTexture = require("gl-texture2d");
var createShader = require("gl-shader");
var glslify = require("glslify");

g.width = W;
g.height = H;
var gameCtx = g.getContext("2d");

u.width = FW;
u.height = FH;
var uiCtx = u.getContext("2d");

var ctx;

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

var blur1dShader = createShader(gl, glslify(__dirname+"/static.vert"), glslify(__dirname+"/blur1d.frag"));
blur1dShader.bind();

blur1dShader.attributes.p.pointer();

var copyShader = createShader(gl, glslify(__dirname+"/static.vert"), glslify(__dirname+"/copy.frag"));
copyShader.bind();

copyShader.attributes.p.pointer();

var laserShader = createShader(gl, glslify(__dirname+"/static.vert"), glslify(__dirname+"/laser.frag"));
laserShader.bind();

laserShader.attributes.p.pointer();

var persistenceShader = createShader(gl, glslify(__dirname+"/static.vert"), glslify(__dirname+"/persistence.frag"));
persistenceShader.bind();

persistenceShader.attributes.p.pointer();

var glareShader = createShader(gl, glslify(__dirname+"/static.vert"), glslify(__dirname+"/glare.frag"));
glareShader.bind();

glareShader.attributes.p.pointer();

var playerShader = createShader(gl, glslify(__dirname+"/static.vert"), glslify(__dirname+"/player.frag"));
playerShader.bind();

playerShader.attributes.p.pointer();

var gameShader = createShader(gl, glslify(__dirname+"/static.vert"), glslify(__dirname+"/game.frag"));
gameShader.bind();

gameShader.attributes.p.pointer();

var persistenceFbo = createFBO(gl, [W, H]);
var playerFbo = createFBO(gl, [W, H]);
var glareFbo = createFBO(gl, [W, H]);
var laserFbo = createFBO(gl, [W, H]);

var fbo1 = createFBO(gl, [W, H]);
var fbo2 = createFBO(gl, [W, H]);

var textureGame = createTexture(gl, g);

textureGame.minFilter =
textureGame.magFilter = gl.LINEAR;

var t = 0, dt;

// GAME STATE
var spaceship = [ W/2, H/2, 0, 0 ]; // [x, y, rot, vel]
var asteroids = []; // array of [x, y, rot, vel, shape, lvl]
// var aliens = []; // array of [x, y, rot, vel]
var bullets = []; // array of [x, y, rot, vel, life, isAlien]

var incomingObjects = []; // array of: [pos, vel, ang, force, rotVel, shape, lvl, key]

var particles = []; // array of [x, y, rot, vel, life]

var dying = 0;
var resurrectionTime = 0;

var best = 0;
var score = 0;
var scoreForLife = 0;
var playingSince = -5000;
var deads = 0;
var player = 0;
var lifes = 0;

randomAsteroids();

// user inputs
var keys = {};

for (var i=0; i<99; ++i) keys[i] = 0;
document.addEventListener("keydown", function (e) {
  keys[e.which] = 1;
});
document.addEventListener("keyup", function (e) {
  keys[e.which] = 0;
});

// game actions

function maybeCreateInc () {
  var sum = incomingObjects.reduce(function (sum, o) {
    return o[6];
  }, 0);
  var probabilityCreateInc = dt * 0.02 *
    Math.exp(-sum*1.2) *
    (1.0 - Math.exp(-playingSince / 90000));
  if (Math.random() > probabilityCreateInc) return;
  return createInc();
}

function sendAsteroid (o) {
  var p = incPosition(o);
  var rot = incRotation(o);
  var x = Math.max(0, Math.min(p[0], W));
  var y = Math.max(0, Math.min(p[1], H));
  var vel = 0.005 * o[3] * (0.5 + 0.5 * Math.random());
  var lvl = o[6];
  var shape = o[5];
  asteroids.push([ x, y, rot, vel, shape, lvl ]);
}

function randomAsteroids () {
  asteroids = [];
  for (var i=0; i<8; ++i) {
    asteroids[i] = [
      W * Math.random(),
      H * Math.random(),
      2 * Math.PI * Math.random(),
      0.02 + 0.02 * Math.random(),
      randomAsteroidShape(Math.floor(1.5 + 3 * Math.random())),
      2
    ];
  }
}

/*
setTimeout(function () {
  setInterval(function () {
    createInc();
    if (incomingObjects[0]) sendAsteroid(incomingObjects[0]);
    incomingObjects.splice(0, 1);
  }, 100);
}, 5000);
*/

function createInc () {
  var pos = Math.random() * borderLength;
  var takenKeys = [], i;
  for (i=0; i<incomingObjects.length; ++i) {
    var o = incomingObjects[i];
    if (pos - 60 < o[0] && o[0] < pos + 60) return 0;
    takenKeys.push(o[7]);
  }
  var availableKeys = [];
  for (i = 65; i<91; i++) {
    if (takenKeys.indexOf(i) == -1)
      availableKeys.push(i);
  }
  if (!availableKeys.length) return 0;

  var vel = 0.1;
  var ang = 2*Math.PI*Math.random();
  var force = 30*Math.random();
  var lvl = Math.floor(2 + 2 * Math.random() * Math.random() + 4 * Math.random() * Math.random() * Math.random());
  var rotVel = 0.002 * (1 + lvl * Math.random() * Math.random());
  var shape = randomAsteroidShape(lvl);
  var key = availableKeys[Math.floor(Math.random() * availableKeys.length)];

  incomingObjects.push([ pos, vel, ang, force, rotVel, shape, lvl, key ]);
  return 1;
}

function randomAsteroidShape (lvl) {
  var n = 4 + lvl * 2;
  var size = lvl * 10;
  var pts = [];
  for (var i = 0; i < n; ++i) {
    var l = size*(0.4 + 0.6 * Math.random());
    var a = 2 * Math.PI * i / n;
    pts.push([
      l * Math.cos(a),
      l * Math.sin(a)
    ]);
  }
  return pts;
}

function explose (o) {
  var n = Math.floor(9 + 9 * Math.random());
  for (var i = 0; i < n; ++i) {
    var l = 20 * Math.random();
    var a = (Math.random() + 2 * Math.PI * i) / n;
    particles.push([
      o[0] + l * Math.cos(a),
      o[1] + l * Math.sin(a),
      a,
      0.06,
      Math.random()<0.3 ? 0 : 1000
    ]);
  }
}

function explodeAsteroid (j) {
  var aster = asteroids[j];
  asteroids.splice(j, 1);
  var lvl = aster[5];
  if (lvl > 1) {
    var nb = Math.round(2+1.5*Math.random());
    for (var k=0; k<nb; k++) {
      var a = Math.random() + 2 * Math.PI * k / nb;
      asteroids.push([
        aster[0] + 10 * Math.cos(a),
        aster[1] + 10 * Math.sin(a),
        a,
        0.8 * aster[3],
        randomAsteroidShape(lvl-1),
        lvl - 1
      ]);
    }
  }
}

// GAME LOGIC

/*
function euclidPhysics (obj) {
  obj[0] += obj[2] * dt;
  obj[1] += obj[3] * dt;
}
*/

function path (pts, noclose) {
  ctx.beginPath();
  var mv = 1;
  for (var i = 0; pts && i<pts.length; ++i) {
    var p = pts[i];
    if (p) {
      if (mv) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
      mv = 0;
    }
    else mv = 1;
  }
  if (!noclose) ctx.closePath();
}

function polarPhysics (obj) {
  var x = Math.cos(obj[2]);
  var y = Math.sin(obj[2]);
  var s = dt * obj[3];
  obj[0] += s * x;
  obj[1] += s * y;
}

function incomingPhysics (obj) {
  obj[0] = (obj[0] + dt * obj[1]) % borderLength;
}

function destroyOutOfBox (obj, i, arr) {
  var B = 20;
  if (obj[0] < -B || obj[1] < -B || obj[0] > W+B || obj[1] > H+B) {
    arr.splice(i, 1);
  }
}

function applyLife (obj, i, arr) {
  if ((obj[4] -= dt) < 0) {
    arr.splice(i, 1);
  }
}

function loopOutOfBox (obj) {
  if (obj[0] < 0) {
    obj[0] += W;
  }
  else if (obj[0] > W) {
    obj[0] -= W;
  }
  if (obj[1] < 0) {
    obj[1] += H;
  }
  else if (obj[1] > H) {
    obj[1] -= H;
  }
}

function circleCollides (a, b, r) {
  var x = a[0] - b[0];
  var y = a[1] - b[1];
  return x*x+y*y < r*r;
}

function spaceshipDie() {
  if (dying) return;
  dying = t;
  deads ++;
}

/*
function resetSpaceship () {
  var x = W * (0.25 + 0.5 * Math.random());
  var y = H * (0.25 + 0.5 * Math.random());
  spaceship = [x, y, 0, 0];
}
*/

function applyIncLogic (o) {
  o[2] += o[4] * dt;
  o[3] = o[3] < 10 ? 60 : o[3] * (1 - 0.0008 * dt);
}

// AI inputs
var AIshoot = 0, AIboost = 0, AIrotate = 0,
  AIa, AIb, AIc, AId, AIe, AIf; // eslint-disable-line

function update () {
  var nbSpaceshipBullets = 0;

  // player lifecycle

  playingSince += dt;

  if (lifes == 0 && playingSince > 0) {
    // player enter
    resurrectionTime = t;
    lifes = 4;
    player ++;
    score = 0;
    scoreForLife = 0;
    asteroids = [];
  }

  // inc lifecycle

  for (var i = 0; i < incomingObjects.length;) {
    var o = incomingObjects[i];
    if (keys[o[7]]) {
      // send an asteroid
      sendAsteroid(o);
      incomingObjects.splice(i, 1);
    }
    else i++;
  }

  while(maybeCreateInc());

  // spaceship lifecycle

  if (dying && t-dying > 2000 + (lifes>1 ? 0 : 2000)) {
    dying = 0;
    spaceship = [ W/2, H/2, 0, 0 ];
    if (--lifes) {
      resurrectionTime = t;
    }
    else {
      // Player lost. game over
      playingSince = -5000;
      randomAsteroids();
    }
  }

  // collision

  bullets.forEach(function (bull, i) {
    if (!bull[5]) nbSpaceshipBullets ++;
    var j;

    /*
    // bullet-spaceship collision
    if (!dying && bull[4]<270 && circleCollides(bull, spaceship, 20)) {
      explose(bull);
      bullets.splice(i, 1);
      spaceshipDie();
      return;
    }
    */

    /*
    for (j = 0; j < aliens.length; ++j) {
      var alien = aliens[j];
      if (circleCollides(bull, alien, 20)) {
        explose(bull);
        bullets.splice(i, 1);
        aliens.splice(j, 1);
        return;
      }
    }
    */

    for (j = 0; j < asteroids.length; ++j) {
      var aster = asteroids[j];
      var lvl = aster[5];
      // bullet-asteroid collision
      if (circleCollides(bull, aster, 10 * lvl)) {
        explose(bull);
        bullets.splice(i, 1);
        explodeAsteroid(j);
        var s = 10 * Math.floor(0.4 * (6 - lvl) * (6 - lvl));
        score += s;
        scoreForLife += s;
        if (scoreForLife > 10000) {
          lifes ++;
          scoreForLife = 0;
        }
        best = Math.max(best, score);
        return;
      }
    }
  });

  if (!dying && playingSince > 0) asteroids.forEach(function (aster, j) {
    // asteroid-spaceship collision
    if (circleCollides(aster, spaceship, 10 + 10 * aster[5])) {
      if (t - resurrectionTime < 1000) {
        // if spaceship just resurect, will explode the asteroid
        explodeAsteroid(j);
      }
      else {
        // otherwise, player die
        explose(spaceship);
        spaceshipDie();
      }
    }
  });

  // run spaceship AI
  if (!dying && playingSince > 0) {

    // ai logic (determine the 3 inputs)

    AIshoot = playingSince > 4000 && Math.random() < 0.003*dt;
    if (playingSince > 2000 && Math.random() < 0.01*dt)
      AIrotate = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1;

    AIboost = 0;

    if (!AIa && playingSince > 3000) {
      AIa = 1;
      AIboost = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1;
    }
    AIa = Math.random() < 0.0001 * dt;

    // apply ai inputs with game logic

    spaceship[3] += AIboost * dt * 0.0002;
    spaceship[2] += AIrotate * dt * 0.005;
    if (nbSpaceshipBullets < 4) {
      if (AIshoot) {
        var x = spaceship[0] + 14 * Math.cos(spaceship[2]);
        var y = spaceship[1] + 14 * Math.sin(spaceship[2]);
        bullets.push([ x, y, spaceship[2], spaceship[3] + 0.3, 1000, 0 ]);
      }
    }
  }

  // apply physics
  polarPhysics(spaceship);
  asteroids.forEach(polarPhysics);
  //aliens.forEach(polarPhysics);
  bullets.forEach(polarPhysics);
  particles.forEach(polarPhysics);
  incomingObjects.forEach(incomingPhysics);

  incomingObjects.forEach(applyIncLogic);

  // after physics logic
  particles.forEach(applyLife);
  loopOutOfBox(spaceship);
  asteroids.forEach(playingSince > 0 ? destroyOutOfBox : loopOutOfBox);
  //aliens.forEach(loopOutOfBox);
  bullets.forEach(applyLife);
  bullets.forEach(loopOutOfBox);
}


function incPosition (o) {
  var p = o[0];
  var x, y;
  var w = W + GAME_INC_PADDING;
  var h = H + GAME_INC_PADDING;
  if (p<w) {
    x = p;
    y = 0;
  }
  else {
    p -= w;
    if (p < h) {
      x = w;
      y = p;
    }
    else {
      p -= h;
      if (p < w) {
        x = w - p;
        y = h;
      }
      else {
        p -= w;
        x = 0;
        y = h - p;
      }
    }
  }
  return [ -GAME_INC_PADDING/2 + x, -GAME_INC_PADDING/2 + y ];
}

function incRotation (o) {
  var p = incPosition(o);
  var toCenter = Math.atan2(H/2 - p[1], W/2 - p[0]);
  return Math.cos(o[2]) * Math.PI / 3 + toCenter;
  //return o[2];
}

// Game DRAWING

function drawSpaceship (o) {
  ctx.strokeStyle = "#f00";
  ctx.globalAlpha = 0.4;
  ctx.rotate(o[2]);
  if (dying) {
    ctx.lineWidth = 2;
    var delta = (t-dying)/200;

    path([
      [-6, -6 - 0.5*delta],
      [3, -3 - 0.9*delta]
    ]);
    ctx.stroke();

    if (delta < 8) {
      path([
        [3 + 0.4*delta, -3 - 0.8*delta],
        [12 + 0.4*delta, 0 - 0.5*delta]
      ]);
      ctx.stroke();
    }

    path([
      [12, 0+0.4*delta],
      [3, 3+delta]
    ]);
    ctx.stroke();

    if (delta < 9) {
      path([
        [1, 5 + delta],
        [-6, 6 + delta]
      ]);
      ctx.stroke();
    }

    if (delta < 7) {
      path([
        [-6 - delta, -6],
        [-6 - delta, 6]
      ]);
      ctx.stroke();
    }
  }
  else {
    path([
      [-6, -6],
      [ 12, 0],
      [ -6, 6],
      [ -5, 0]
    ]);
    ctx.stroke();
  }
}

function drawAsteroid (o) {
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = "#f00";
  path(o[4]);
  ctx.stroke();
}

function drawBullet () {
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#00f";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, 2*Math.PI);
  ctx.fill();
}

function drawParticle (o) {
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = "#f00";
  ctx.rotate(o[2]);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, 2*Math.PI);
  ctx.fill();
}
function drawGameUI () {
  save();
  ctx.fillStyle = ctx.strokeStyle = "#0f0";
  ctx.globalAlpha = 0.3;


  save();
  ctx.translate(W/2, 20);
  font(scoreTxt(best), .6);
  restore();

  save();
  ctx.translate(30, 20);
  font(scoreTxt(score), 1.5, 1);
  restore();

  if (playingSince < 0) {
    save();
    ctx.translate(W-30, 20);
    font(scoreTxt(0), 1.5, -1);
    restore();

    save();
    ctx.translate(W/2 - 160, 0.7*H);
    path([
      [0,2],
      [0,18]
    ]);
    ctx.stroke();
    ctx.translate(40,0);
    font("COIN", 2, 1);
    ctx.translate(40,0);
    path([
      [0,2],
      [0,18]
    ]);
    ctx.stroke();
    ctx.translate(40,0);
    font("PLAY", 2, 1);
    restore();
  }
  else {
    for (var i=1; i<lifes; i++) {
      save();
      ctx.translate(40 + i * 10, 50);
      ctx.rotate(-Math.PI/2);
      path([
        [-4, -4],
        [ 10, 0],
        [ -4, 4],
        [ -3, 0]
      ]);
      ctx.stroke();
      restore();
    }
  }
  if (dying && lifes==1) {
    save();
    ctx.lineWidth = 2;
    ctx.translate(W/2, 140);
    font("GAME OVER", 2);
    restore();
  }
  save();
  ctx.translate(W/2, H-14);
  font("2015 GREWEB INC", .6);
  restore();
  restore();
}

function drawGlitch () {
  save();
  ctx.fillStyle =
  ctx.strokeStyle = "#f00";
  ctx.globalAlpha = 0.05;
  ctx.translate(W/2, H/2);
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, 2*Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, 2*Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 12, 4, 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 12, 1, 2);
  ctx.stroke();
  restore();
  /*
  float destroyed () {
    vec2 ratio = vec2(1.0, dim.x / dim.y);
    float d = distance(uv/ratio, vec2(0.5)/ratio);
    return step(d, 0.008) +
    step(0.023, d) * step(d, 0.026);
  }
  */
}

//// UI

function drawInc (o) {
  var rot = incRotation(o);

  ctx.fillStyle =
  ctx.strokeStyle = "#9af";
  var pts = o[5];

  save();
  ctx.globalAlpha = 0.4 + 0.6 * o[3] / 60;
  ctx.rotate(rot);
  var mx = 60 + 10 * o[6];
  var x = o[3] + 10 * o[6];
  /*
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(mx, 0);
  ctx.stroke();
  */
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.moveTo(0, 0);
  ctx.lineTo(x, 0);
  ctx.stroke();
  var r = 6;
  path([
    [ mx - r, r ],
    [ mx, 0],
    [ mx - r, -r ]
  ], 1);
  ctx.stroke();
  restore();

  save();
  path(pts);
  ctx.fill();
  /*
  ctx.strokeStyle = "#000";
  ctx.stroke();
  */
  restore();

  var sum = [0, 0];
  pts.forEach(function (p) {
    sum[0] += p[0];
    sum[1] += p[1];
  });

  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String.fromCharCode(o[7]), sum[0]/pts.length, sum[1]/pts.length);
}

function drawUI () {
  ctx.fillStyle = "#9af";
  ctx.font = "normal 32px sans-serif";
  ctx.fillText((player*25)+" ¢", GAME_MARGIN, 40);
}

var FONT0 = [ // 0
  [0, 0],
  [2, 0],
  [2, 2],
  [0, 2],
  [0, 0]
];
var FONT = [
  FONT0,
  [ // 1
    [1, 0],
    [1, 2]
  ],
  [ // 2
    [0, 0],
    [2, 0],
    [2, 1],
    [0, 1],
    [0, 2],
    [2, 2]
  ],
  [ // 3
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
    ,
    [0, 1],
    [2, 1]
  ],
  [ // 4
    [0, 0],
    [0, 1],
    [2, 1],
    ,
    [2, 0],
    [2, 2]
  ],
  [ // 5
    [2, 0],
    [0, 0],
    [0, 1],
    [2, 1],
    [2, 2],
    [0, 2]
  ],
  [ // 6
    [0, 0],
    [0, 2],
    [2, 2],
    [2, 1],
    [0, 1]
  ],
  [ // 7
    [0, 0],
    [2, 0],
    [2, 2]
  ],
  [ // 8
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
    [0, 0],
    ,
    [0, 1],
    [2, 1]
  ],
  [ // 9
    [2, 2],
    [2, 0],
    [0, 0],
    [0, 1],
    [2, 1]
  ]
];
[
  [// A
    [0,2],
    [0,2/3],
    [1,0],
    [2,2/3],
    [2,2],
    ,
    [0,4/3],
    [2,4/3]
  ],
  [ // B
    [0, 1],
    [0, 0],
    [4/3,0],
    [2,1/3],
    [2,2/3],
    [4/3,1],
    [0,1],
    [0,2],
    [4/3,2],
    [2,5/3],
    [2,4/3],
    [4/3,1]
  ],
  [// C
    [2,0],
    [0,0],
    [0,2],
    [2,2]
  ],
  ,// D
  [// E
    [2,0],
    [0,0],
    [0,2],
    [2,2],
    ,
    [0,1],
    [1.5,1]
  ],
  ,// F
  [// G
    [2,2/3],
    [2,0],
    [0,0],
    [0,2],
    [2,2],
    [2,4/3],
    [1,4/3]
  ],
  ,// H
  [// I
    [0,0],
    [2,0],
    ,
    [1,0],
    [1,2],
    ,
    [0,2],
    [2,2]
  ],
  ,// J
  ,// K
  [// L
    [0,0],
    [0,2],
    [2,2]
  ],
  [// M
    [0,2],
    [0,0],
    [1,2/3],
    [2,0],
    [2,2]
  ],
  [// N
    [0,2],
    [0,0],
    [2,2],
    [2,0]
  ],
  FONT0,// O
  [// P
    [0,2],
    [0,0],
    [2,0],
    [2,1],
    [0,1]
  ],
  ,// Q
  [// R
    [0,2],
    [0,0],
    [2,0],
    [2,1],
    [0,1],
    [2,2]
  ],
  ,// S
  ,// T
  ,// U
  [// V
    [0,0],
    [1,2],
    [2,0]
  ],
  [// W
    [0,0],
    [0,2],
    [1,4/3],
    [2,2],
    [2,0]
  ],
  ,// X
  [// Y
    [0,0],
    [1,2/3],
    [2,0],
    ,
    [1,2/3],
    [1,2]
  ],
  ,// Z
].forEach(function (c, i) {
  FONT[String.fromCharCode(65+i)] = c;
});

// oO ASTEROIDS font with fontSize and align (-1:right, 0:center, 1:left)
// will side effect some ctx.translate() (that you could benefit to make text follow)
function font (txt, fontSize, align) {
  var l = fontSize*11*txt.length;
  ctx.translate(align ? (align>0 ? 0 : -l) : -l/2, 0);
  for (var i=0; i<txt.length; i++) {
    path(FONT[txt[i]] && FONT[txt[i]].map(function (o) {
      return o && [4*fontSize*o[0], 5*fontSize*o[1]];
    }), 1);
    ctx.stroke();
    ctx.translate(fontSize*11, 0);
  }
}

function scoreTxt (s) {
  return (s<=9?"0":"")+s;
}

// Game Post Effects


// Main Code

function translateTo (p) {
  ctx.translate(p[0], p[1]);
}
function save () {
  ctx.save();
}
function restore () {
  ctx.restore();
}

function renderCollection (coll, draw) {
  for (var i=0; i<coll.length; ++i) {
    save();
    translateTo(coll[i]);
    draw(coll[i]);
    restore();
  }
}

var _lastT;
function render (_t) {
  raf(render);
  if (!_lastT) _lastT = _t;
  dt = Math.min(100, _t-_lastT);
  _lastT = _t;

  t += dt; // accumulate the game time (that is not the same as _t)

  update();

  // UI Rendering

  ctx = uiCtx;

  save();

  save();
  ctx.clearRect(0, 0, FW, FH);

  drawUI();

  ctx.translate(GAME_MARGIN, GAME_MARGIN);

  incomingObjects.forEach(function (inc) {
    save();
    translateTo(incPosition(inc));
    drawInc(inc);
    restore();
  });

  restore();

  restore();

  // Game rendering

  ctx = gameCtx;

  save();

  save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  restore();

  renderCollection(asteroids, drawAsteroid);
  //renderCollection(aliens, drawAlien);
  renderCollection(bullets, drawBullet);
  renderCollection(particles, drawParticle);

  if (playingSince > 0) {
    save();
    translateTo(spaceship);
    drawSpaceship(spaceship);
    restore();
  }

  drawGameUI();

  drawGlitch();

  restore();

  // WEBGL after effects

  textureGame.setPixels(g);

  laserFbo.bind();
  laserShader.bind();
  laserShader.uniforms.t = textureGame.bind(0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);


  playerFbo.bind();
  playerShader.bind();
  playerShader.uniforms.pt = playingSince / 1000;
  playerShader.uniforms.pl = player;
  playerShader.uniforms.S = SEED;
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  fbo1.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = playerFbo.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ 6, 0 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  fbo2.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = fbo1.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ 0, 2 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  fbo1.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = fbo2.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ 2, 1 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  playerFbo.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = fbo1.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ 2, -1 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Glare
  glareFbo.bind();
  glareShader.bind();
  glareShader.uniforms.t = laserFbo.color[0].bind(0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  fbo1.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = glareFbo.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ 1, -2 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  fbo2.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = fbo1.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ 1.8, -4 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  fbo1.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = fbo2.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ 2.2, -4 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glareFbo.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = fbo1.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ 2, -4 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Blur
  fbo1.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = laserFbo.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ 1, 0.2 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  fbo2.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = fbo1.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ -0.2, 1 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  fbo1.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = fbo2.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ 1, 0 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  fbo2.bind();
  blur1dShader.bind();
  blur1dShader.uniforms.t = fbo1.color[0].bind(0);
  blur1dShader.uniforms.dim = [ W, H ];
  blur1dShader.uniforms.dir = [ 0, 1 ];
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  fbo1.bind();
  persistenceShader.bind();
  persistenceShader.uniforms.t = fbo2.color[0].bind(0);
  persistenceShader.uniforms.r = persistenceFbo.color[0].bind(1);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  persistenceFbo.bind();
  copyShader.bind();
  copyShader.uniforms.t = fbo1.color[0].bind(0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);
  gameShader.bind();
  gameShader.uniforms.g = laserFbo.color[0].bind(0);
  gameShader.uniforms.r = persistenceFbo.color[0].bind(1);
  gameShader.uniforms.b = fbo2.color[0].bind(2);
  gameShader.uniforms.l = glareFbo.color[0].bind(3);
  gameShader.uniforms.e = playerFbo.color[0].bind(4);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

raf(render);
