/* global
font,
path,
glCreateFBO,
glCreateShader,
glCreateTexture,
glUniformLocation,
glBindFBO,
glBindShader,
glGetFBOTexture,
glBindTexture,
glSetTexture
c,
d,
u,
g,
STATIC_VERT,
BLUR1D_FRAG,
COPY_FRAG,
GAME_FRAG,
GLARE_FRAG,
LASER_FRAG,
PERSISTENCE_FRAG,
PLAYER_FRAG,
jsfxr
*/



/* TODO list
- BUG: fix the velocity (to cartesian)
- ai
  - make a very good AI
  - tweak this AI to make variant of difficulty (based on player number)
- audio
- mobile
- game features (if time)
  - UFO "bonus"
*/

var gl = c.getContext("webgl"),
  ctx,
  gameCtx = g.getContext("2d"),
  uiCtx = u.getContext("2d"),
  FW = 800,
  FH = 680,
  GAME_MARGIN = 120,
  GAME_INC_PADDING = 80,
  W = FW - 2 * GAME_MARGIN,
  H = FH - 2 * GAME_MARGIN,
  borderLength = 2*(W+H+2*GAME_INC_PADDING),
  SEED = Math.random();

d.style.width = FW + "px";
g.width = c.width = W;
g.height = c.height = H;
c.style.top = GAME_MARGIN + "px";
c.style.left = GAME_MARGIN + "px";
u.width = FW;
u.height = FH;

// set up WebGL layer


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



/// GAME STATE

var t = 0, dt,

  spaceship = [ W/2, H/2, 0, 0, 0 ], // [x, y, velx, vely, rot]
  asteroids = [], // array of [x, y, rot, vel, shape, lvl]
//  aliens = []; // array of [x, y, rot, vel]
  bullets = [], // array of [x, y, rot, vel, life, isAlien]
  incomingObjects = [], // array of: [pos, vel, ang, force, rotVel, shape, lvl, key]
  particles = [], // array of [x, y, rot, vel, life]

  dying = 0,
  resurrectionTime = 0,
  best = 0,
  score = 0,
  scoreForLife = 0,
  playingSince = -5000,
  deads = 0,
  player = 0,
  lifes = 0,

  AIshoot = 0, AIboost = 0, AIrotate = 0;

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

function maybeCreateInc () {
  var sum = incomingObjects.reduce(function (sum, o) {
    return o[6];
  }, 0);
  var probabilityCreateInc = dt * 0.02 *
    Math.exp(-sum*2) *
    (1 + player / 3 - Math.exp(-playingSince / 60000));
  if (Math.random() > probabilityCreateInc) return;
  return createInc();
}

function createInc () {
  var pos = Math.random() * borderLength;
  var takenKeys = [], i;
  for (i=0; i<incomingObjects.length; ++i) {
    var o = incomingObjects[i];
    var p = o[0] % borderLength;
    if (pos - 60 < p && p < pos + 60) return 0;
    takenKeys.push(o[7]);
  }
  var availableKeys = [];
  for (i = 65; i<91; i++) {
    if (takenKeys.indexOf(i) == -1)
      availableKeys.push(i);
  }
  if (!availableKeys.length) return 0;

  var vel = 0.1; // FIXME remove
  var ang = 2*Math.PI*Math.random();
  var force = 30*Math.random();
  var lvl = Math.floor(2 + 3 * Math.random() * Math.random() + 4 * Math.random() * Math.random() * Math.random());
  var rotVel = 0.002 * (1 - 0.5 * Math.exp((1-player)/3) + lvl * Math.random() * Math.random());
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

// Utils

// normalize radian angle between -PI and PI (assuming it is not too far)
function normAngle (a) {
  return a < -Math.PI ? a + 2*Math.PI :
  a>Math.PI ? a - 2*Math.PI : a;
}

// GAME LOGIC

function euclidPhysics (obj) {
  obj[0] += obj[2] * dt;
  obj[1] += obj[3] * dt;
}

function polarPhysics (obj) {
  var x = Math.cos(obj[2]);
  var y = Math.sin(obj[2]);
  var s = dt * obj[3];
  obj[0] += s * x;
  obj[1] += s * y;
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

function dist (a, b) {
  var x = a[0]-b[0];
  var y = a[1]-b[1];
  return Math.sqrt(x * x + y * y);
}

/*
function resetSpaceship () {
  var x = W * (0.25 + 0.5 * Math.random());
  var y = H * (0.25 + 0.5 * Math.random());
  spaceship = [x, y, 0, 0];
}
*/

function applyIncLogic (o) {
  o[0] += 0.1 * dt;
  o[2] += o[4] * dt;
  o[3] = o[3] < 10 ? 60 : o[3] * (1 - 0.0008 * dt);
}

// AI states
function aiLogic () { // set the 3 AI inputs (rotate, shoot, boost)
  var x, y;
  var prevRot = AIrotate;
  //var prevBoost = AIboost;
  AIrotate = 0;
  AIshoot = 0;
  AIboost = 0;

  var ax = Math.cos(spaceship[4]);
  var ay = Math.sin(spaceship[4]);
  var vel = Math.sqrt(spaceship[2]*spaceship[2]+spaceship[3]*spaceship[3]);

  var xDistanceToEdge = Math.min(spaceship[0], W-spaceship[0]);
  var yDistanceToEdge = Math.min(spaceship[1], H-spaceship[1]);
  var pred = 200 + 300 * Math.random();
  var predSpaceship = [
    spaceship[0] + pred * spaceship[2],
    spaceship[1] + pred * spaceship[3]
  ];

  function opp (dx, dy) { // going opposite of a vector based on current head direction
    return (ax > ay) ?
      ((ax<0)==(dx<0) ? -1 : 1) :
      ((ay<0)==(dy<0) ? -1 : 1);
  }

  // From the least to the most important reactions

  // random behavior
  if (playingSince > 1000) {
    AIshoot = playingSince > 3000 && Math.random() < 0.00001*dt*(1+asteroids.length);
    if (playingSince > 2000 && Math.random() < 0.001*dt*(1+asteroids.length))
      AIrotate = Math.random() < 0.2 ? 0 : Math.random() < 0.5 ? -1 : 1;
    else
      AIrotate = Math.random() < 0.002 * dt ? 0 : prevRot;

    AIboost = Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? -1 : 1;
    if (Math.exp(-vel*10)<Math.random()) {
      AIboost = opp(spaceship[2], spaceship[3]);
    }
  }

  // trying to avoid edges

  if (xDistanceToEdge < 100 || yDistanceToEdge < 100) {
    AIboost = (xDistanceToEdge < yDistanceToEdge) ?
      ((spaceship[0]<W/2)==(ax<0) ? -1 : 1) :
      ((spaceship[1]<H/2)==(ay<0) ? -1 : 1);
  }

  var closestAsteroid, closestAsteroidPredDist;
  var smallerDangerousAsteroid, smallerDangerousAsteroidWeight;

  for (i = 0; i < asteroids.length; ++i) {
    var a = asteroids[i];
    x = Math.cos(a[2]);
    y = Math.sin(a[2]);
    var s = pred * a[3];
    var aPred = [].concat(a);
    aPred[0] += s * x;
    aPred[1] += s * y;
    var curDist = dist(a, spaceship) - (10 + 10 * a[5]);
    var predDist = dist(aPred, predSpaceship) - (10 + 10 * a[5]);
    if (curDist - predDist > pred / 200 && // approaching
      (curDist < 80 || predDist < 50)) {
      // imminent collision
      if (!closestAsteroid || predDist < closestAsteroidPredDist) {
        closestAsteroid = a;
        smallerDangerousAsteroid = a;
        closestAsteroidPredDist = predDist;
      }
    }

    if (curDist < 100 || predDist < 100) {
      var w = a[5];
      if (!closestAsteroid || w < smallerDangerousAsteroidWeight) {
        smallerDangerousAsteroid = aPred;
        smallerDangerousAsteroidWeight = w;
      }
    }
  }

  if (closestAsteroid) {
    x = closestAsteroid[0]-spaceship[0];
    y = closestAsteroid[1]-spaceship[1];
    AIboost = opp(x, y);
  }

  if (smallerDangerousAsteroid) {
    x = smallerDangerousAsteroid[0]-spaceship[0];
    y = smallerDangerousAsteroid[1]-spaceship[1];
    var ang = normAngle(Math.atan2(y, x)-spaceship[4]);
    var angabs = Math.abs(ang);
    if (Math.random() < 2*angabs) AIrotate = ang > 0 ? 1 : -1;
    AIshoot = Math.random() < 0.01 * dt * Math.exp(-angabs*10);
  }
}


function update () {
  var i;
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

  for (i = 0; i < incomingObjects.length;) {
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
    spaceship = [ W/2, H/2, 0, 0, 0 ];
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
    var ax = Math.cos(spaceship[4]);
    var ay = Math.sin(spaceship[4]);

    // ai logic (determine the 3 inputs)
    aiLogic();

    // apply ai inputs with game logic

    spaceship[2] += AIboost * dt * 0.0002 * ax;
    spaceship[3] += AIboost * dt * 0.0002 * ay;
    spaceship[4] = normAngle(spaceship[4] + AIrotate * dt * 0.005);
    if (nbSpaceshipBullets < 4) {
      if (AIshoot) {
        bullets.push([
          spaceship[0] + 14 * ax,
          spaceship[1] + 14 * ay,
          spaceship[2] + 0.3 * ax,
          spaceship[3] + 0.3 * ay,
          1000,
          0
        ]);
      }
    }
  }

  euclidPhysics(spaceship);
  asteroids.forEach(polarPhysics);
  //aliens.forEach(polarPhysics);
  bullets.forEach(euclidPhysics);
  particles.forEach(polarPhysics);

  incomingObjects.forEach(applyIncLogic);

  particles.forEach(applyLife);
  loopOutOfBox(spaceship);
  asteroids.forEach(playingSince > 0 ? destroyOutOfBox : loopOutOfBox);
  //aliens.forEach(loopOutOfBox);
  bullets.forEach(applyLife);
  bullets.forEach(loopOutOfBox);
}


function incPosition (o) {
  var p = o[0] % borderLength;
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
  ctx.rotate(o[4]);
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
  ctx.globalAlpha = 1 - Math.random()*Math.random();
  ctx.fillStyle = "#00f";
  ctx.beginPath();
  ctx.arc(0, 0, 1.5+2.5*Math.random(), 0, 2*Math.PI);
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
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = "#0f0";
  ctx.globalAlpha = 0.3;


  ctx.save();
  ctx.translate(W/2, 20);
  font(scoreTxt(best), .6);
  ctx.restore();

  ctx.save();
  ctx.translate(30, 20);
  font(scoreTxt(score), 1.5, 1);
  ctx.restore();

  if (playingSince < 0) {
    ctx.save();
    ctx.translate(W-30, 20);
    font(scoreTxt(0), 1.5, -1);
    ctx.restore();

    ctx.save();
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
    ctx.restore();
  }
  else {
    for (var i=1; i<lifes; i++) {
      ctx.save();
      ctx.translate(40 + i * 10, 50);
      ctx.rotate(-Math.PI/2);
      path([
        [-4, -4],
        [ 10, 0],
        [ -4, 4],
        [ -3, 0]
      ]);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (dying && lifes==1) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.translate(W/2, 140);
    font("GAME OVER", 2);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(W/2, H-14);
  font("2015 GREWEB INC", .6);
  ctx.restore();
  ctx.restore();
}

function drawGlitch () {
  ctx.save();
  ctx.fillStyle =
  ctx.strokeStyle = "#f00";
  ctx.globalAlpha = 0.03;
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
  ctx.restore();
}

//// UI

function drawInc (o) {
  var rot = incRotation(o);

  ctx.fillStyle =
  ctx.strokeStyle = "#9cf";
  var pts = o[5];

  ctx.save();
  ctx.globalAlpha = 0.4 + 0.6 * o[3] / 60;
  ctx.rotate(rot);
  var mx = 60 + 10 * o[6];
  var x = o[3] + 10 * o[6];
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
  ctx.restore();

  ctx.save();
  path(pts);
  ctx.fill();
  ctx.restore();

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
  ctx.fillStyle = "#adf";
  ctx.font = "normal 32px sans-serif";
  ctx.fillText((player*25)+" ¢", GAME_MARGIN, 40);
}


function scoreTxt (s) {
  return (s<=9?"0":"")+s;
}

// Game Post Effects

// Main Code

function translateTo (p) {
  ctx.translate(p[0], p[1]);
}
function renderCollection (coll, draw) {
  for (var i=0; i<coll.length; ++i) {
    ctx.save();
    translateTo(coll[i]);
    draw(coll[i]);
    ctx.restore();
  }
}

var _lastT;
function render (_t) {
  requestAnimationFrame(render);
  if (!_lastT) _lastT = _t;
  dt = Math.min(100, _t-_lastT);
  _lastT = _t;

  t += dt; // accumulate the game time (that is not the same as _t)

  // UPDATE game

  update();

  // RENDER game

  // UI Rendering

  ctx = uiCtx;

  ctx.save();

  ctx.save();
  ctx.clearRect(0, 0, FW, FH);

  drawUI();

  ctx.translate(GAME_MARGIN, GAME_MARGIN);

  incomingObjects.forEach(function (inc) {
    ctx.save();
    translateTo(incPosition(inc));
    drawInc(inc);
    ctx.restore();
  });

  ctx.restore();

  ctx.restore();

  // Game rendering

  ctx = gameCtx;

  ctx.save();

  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  renderCollection(asteroids, drawAsteroid);
  //renderCollection(aliens, drawAlien);
  renderCollection(bullets, drawBullet);
  renderCollection(particles, drawParticle);

  if (playingSince > 0) {
    ctx.save();
    translateTo(spaceship);
    drawSpaceship(spaceship);
    ctx.restore();
  }

  drawGameUI();

  drawGlitch();

  ctx.restore();

  // WEBGL after effects

  glSetTexture(textureGame, g);

  // Laser
  glBindFBO(laserFbo);
  glBindShader(laserShader);
  gl.uniform1i(glUniformLocation(laserShader, "t"), glBindTexture(textureGame, 0));
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Player / env
  glBindFBO(playerFbo);
  glBindShader(playerShader);
  gl.uniform1f(glUniformLocation(playerShader, "pt"), playingSince / 1000);
  gl.uniform1f(glUniformLocation(playerShader, "pl"), player);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(fbo1);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(playerFbo), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  6, 0 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(fbo2);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(fbo1), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  0, 2 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(fbo1);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(fbo2), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  2, 1 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(playerFbo);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(fbo1), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  2, -1 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Glare
  glBindFBO(glareFbo);
  glBindShader(glareShader);
  gl.uniform1i(glUniformLocation(glareShader, "t"), glBindTexture(glGetFBOTexture(laserFbo), 0));
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(fbo1);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(glareFbo), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  1, -2 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(fbo2);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(fbo1), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  2, -4 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(fbo1);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(fbo2), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  2, -5 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(glareFbo);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(fbo1), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  2, -4 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Blur
  glBindFBO(fbo1);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(laserFbo), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  1, 1 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(fbo2);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(fbo1), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  -1, 1 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(fbo1);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(fbo2), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  1.5, 0 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(fbo2);
  glBindShader(blur1dShader);
  gl.uniform1i(glUniformLocation(blur1dShader, "t"), glBindTexture(glGetFBOTexture(fbo1), 0));
  gl.uniform2f(glUniformLocation(blur1dShader, "dir"),  0, 1.5 );
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Persistence
  glBindFBO(fbo1);
  glBindShader(persistenceShader);
  gl.uniform1i(glUniformLocation(persistenceShader, "t"), glBindTexture(glGetFBOTexture(fbo2), 0));
  gl.uniform1i(glUniformLocation(persistenceShader, "r"), glBindTexture(glGetFBOTexture(persistenceFbo), 1));
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  glBindFBO(persistenceFbo);
  glBindShader(copyShader);
  gl.uniform1i(glUniformLocation(copyShader, "t"), glBindTexture(glGetFBOTexture(fbo1), 0));
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Final draw
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  glBindShader(gameShader);
  gl.uniform1i(glUniformLocation(gameShader, "g"), glBindTexture(glGetFBOTexture(laserFbo), 0));
  gl.uniform1i(glUniformLocation(gameShader, "r"), glBindTexture(glGetFBOTexture(persistenceFbo), 1));
  gl.uniform1i(glUniformLocation(gameShader, "b"), glBindTexture(glGetFBOTexture(fbo2), 2));
  gl.uniform1i(glUniformLocation(gameShader, "l"), glBindTexture(glGetFBOTexture(glareFbo), 3));
  gl.uniform1i(glUniformLocation(gameShader, "e"), glBindTexture(glGetFBOTexture(playerFbo), 4));
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

requestAnimationFrame(render);


/*
// DEBUG
setTimeout(function () {
  setInterval(function () {
    createInc();
    if (incomingObjects[0]) sendAsteroid(incomingObjects[0]);
    incomingObjects.splice(0, 1);
  }, 100);
}, 5000);
*/
