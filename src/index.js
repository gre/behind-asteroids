// Constants
var ctx = c.getContext("2d"),
  raf = requestAnimationFrame,
  GAME_MARGIN = 120,
  GAME_INC_PADDING = 50,
  W = c.width - 2 * GAME_MARGIN,
  H = c.height - 2 * GAME_MARGIN,
  borderLength = 2*(W+H+2*GAME_INC_PADDING);

ctx.globalAlpha = 0.5;

ctx.fillStyle =
ctx.strokeStyle = "#fff";

var t, dt;

// GAME STATE
var spaceship = [ W/2, H/2, 0, 0 ]; // [x, y, rot, vel]
var asteroids = []; // array of [x, y, rot, vel, shape, lvl]
var aliens = []; // array of [x, y, rot, vel]
var bullets = []; // array of [x, y, rot, vel, life, isAlien]

var incomingObjects = []; // array of: [pos, vel, ang, force, rotVel, shape, lvl, key]

var particles = []; // array of [x, y, rot, vel, life]

var dying = 0;
var resurrectionTime = 0;
var deads = 0;

var probabilityCreateInc = 1;

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
  if (Math.random() > probabilityCreateInc) return;
  return createInc();
}

function sendAsteroid (o) {
  var p = incPosition(o);
  var x = Math.max(0, Math.min(p[0], W));
  var y = Math.max(0, Math.min(p[1], H));
  var rot = o[2];
  var vel = 0.005 * o[3] * (0.5 + 0.5 * Math.random());
  var lvl = o[6];
  var shape = randomAsteroidShape(lvl);
  asteroids.push([ x, y, rot, vel, shape, lvl ]);
  var incr = Math.max(0, 0.003 * o[3] * Math.exp(-incomingObjects.length/3));
  probabilityCreateInc += incr;
}

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
    if (takenKeys.indexOf(i) === -1)
      availableKeys.push(i);
  }
  if (!availableKeys.length) return 0;

  var vel = 0.1;
  var ang = 0;
  var force = 0;
  var lvl = Math.floor(2 + 2 * Math.random() * Math.random() + 4 * Math.random() * Math.random() * Math.random());
  var rotVel = 0.001 * (Math.random() - 0.5) * (1 + Math.random() * Math.random() + lvl * Math.random());
  var shape = randomAsteroidShape(lvl);
  var key = availableKeys[Math.floor(Math.random() * availableKeys.length)];

  probabilityCreateInc *= 0.9 / lvl;

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
  var n = Math.floor(8 + 4 * Math.random());
  for (var i = 0; i < n; ++i) {
    var l = 10 * Math.random();
    var a = (Math.random() + 2 * Math.PI * i) / n;
    particles.push([
      o[0] + l * Math.cos(a),
      o[1] + l * Math.sin(a),
      a,
      0.04,
      20 + 10 * Math.random()
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
  for (var i = 0; i<pts.length; ++i) {
    var p = pts[i];
    if (i==0) ctx.moveTo(p[0], p[1]);
    else ctx.lineTo(p[0], p[1]);
  }
  if (!noclose) ctx.closePath();
}
function strokePath (pts, noclose) {
  path(pts, noclose);
  ctx.stroke();
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
  if ((obj[4] -= obj[3] * dt) < 0) {
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

function resetSpaceship () {
  var x = W * (0.25 + 0.5 * Math.random());
  var y = H * (0.25 + 0.5 * Math.random());
  spaceship = [x, y, 0, 0];
}

function applyIncLogic (o) {
  o[2] += o[4] * dt;
  o[3] = o[3] < 5 ? 20 + 50 * Math.random() : o[3] * (1 - 0.001 * dt);
}

// AI inputs
var AIshoot = 0, AIboost = 0, AIrotate = 0;

function update () {
  var nbSpaceshipBullets = 0;

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

  if (dying && t-dying > 2000) {
    dying = 0;
    resetSpaceship();
    resurrectionTime = t;
  }

  // collision

  bullets.forEach(function (bull, i) {
    if (!bull[5]) nbSpaceshipBullets ++;

    var j;
    if (!dying && bull[4]<270 && circleCollides(bull, spaceship, 20)) {
      explose(bull);
      bullets.splice(i, 1);
      spaceshipDie();
      return;
    }
    for (j = 0; j < aliens.length; ++j) {
      var alien = aliens[j];
      if (circleCollides(bull, alien, 20)) {
        explose(bull);
        bullets.splice(i, 1);
        aliens.splice(j, 1);
        return;
      }
    }
    for (j = 0; j < asteroids.length; ++j) {
      var aster = asteroids[j];
      var lvl = aster[5];
      if (circleCollides(bull, aster, 10 * lvl)) {
        explose(bull);
        bullets.splice(i, 1);
        explodeAsteroid(j);
        return;
      }
    }
  });

  if (!dying) asteroids.forEach(function (aster, j) {
    if (circleCollides(aster, spaceship, 10 + 10 * aster[5])) {
      if (t - resurrectionTime < 1000) {
        explodeAsteroid(j);
      }
      else {
        explose(spaceship);
        spaceshipDie();
      }
    }
  });

  // run spaceship AI
  if (!dying) {

    // ai logic (determine the 3 inputs)

    AIshoot = Math.random() < 0.005*dt;
    if (Math.random() < 0.01*dt)
      AIrotate = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1;
    if (Math.random() < 0.01*dt)
      AIboost = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1;


    AIboost = 0;

    // apply ai inputs with game logic

    spaceship[3] += AIboost * dt * 0.0002;
    spaceship[2] += AIrotate * dt * 0.005;
    if (nbSpaceshipBullets < 3) {
      if (AIshoot) {
        var x = spaceship[0] + 14 * Math.cos(spaceship[2]);
        var y = spaceship[1] + 14 * Math.sin(spaceship[2]);
        bullets.push([ x, y, spaceship[2], spaceship[3] + 0.3, 300, 0 ]);
      }
    }
  }

  // apply physics
  polarPhysics(spaceship);
  asteroids.forEach(polarPhysics);
  aliens.forEach(polarPhysics);
  bullets.forEach(polarPhysics);
  particles.forEach(polarPhysics);
  incomingObjects.forEach(incomingPhysics);

  incomingObjects.forEach(applyIncLogic);

  // after physics logic
  particles.forEach(applyLife);
  loopOutOfBox(spaceship);
  asteroids.forEach(destroyOutOfBox);
  aliens.forEach(loopOutOfBox);
  bullets.forEach(applyLife);
  bullets.forEach(loopOutOfBox);
}

// Game DRAWING

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

function drawBg () {
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(GAME_MARGIN, GAME_MARGIN, W, H);
}

function drawSpaceship (o) {
  ctx.rotate(o[2]);
  ctx.globalAlpha = 0.8;
  if (dying) {
    var delta = (t-dying)/200;

    strokePath([
      [-6, -6 - 0.5*delta],
      [3, -3 - 0.9*delta]
    ]);

    if (delta < 8) {
      strokePath([
        [3 + 0.4*delta, -3 - 0.8*delta],
        [12 + 0.4*delta, 0 - 0.5*delta]
      ]);
    }

    strokePath([
      [12, 0+0.4*delta],
      [3, 3+delta]
    ]);

    if (delta < 9) {
      strokePath([
        [1, 5 + delta],
        [-6, 6 + delta]
      ]);
    }

    if (delta < 7) {
      strokePath([
        [-6 - delta, -6],
        [-6 - delta, 6]
      ]);
    }
  }
  else {
    strokePath([
      [-6, -6],
      [ 12, 0],
      [ -6, 6],
      [ -5, 0]
    ]);
  }
}

function drawAsteroid (o) {
  ctx.fillStyle = "#aaa";
  strokePath(o[4]);
}
function drawAlien () {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 22, 16);
}
function drawBullet () {
  ctx.beginPath();
  ctx.globalAlpha = 1;
  ctx.arc(0, 0, 3, 0, 2*Math.PI);
  ctx.fill();
}

function drawInc (o) {
  var pts = o[5];
  ctx.globalAlpha = 1;

  ctx.lineWidth = o[3] > 20 ? 2 : 1;

  save();
  ctx.rotate(o[2]);
  var x = o[3] + 10 * o[6];
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(x, 0);
  ctx.stroke();
  var r = o[3]/6;
  strokePath([
    [ x - r, r ],
    [x, 0],
    [ x - r, -r ]
  ], 1);
  restore();

  save();
  path(pts);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.stroke();
  restore();

  var sum = [0, 0];
  pts.forEach(function (p) {
    sum[0] += p[0];
    sum[1] += p[1];
  });

  ctx.font = "normal 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String.fromCharCode(o[7]), sum[0]/pts.length, sum[1]/pts.length);
}

function drawParticle (o) {
  ctx.rotate(o[2]);
  ctx.globalAlpha = 0.3;
  strokePath([ [0, 0], [4, 0] ]);
}

function drawUI () {
  ctx.font = "normal 16px sans-serif";
  ctx.fillText((deads*25)+" ¢", 10, 20);
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

var lastT;
function render (_t) {
  t = _t;
  raf(render);
  if (!lastT) lastT = t;
  dt = t-lastT;
  lastT = t;

  update();

  save();

  save();
  drawBg();
  restore();

  save();
  drawUI();
  restore();

  ctx.translate(GAME_MARGIN, GAME_MARGIN);

  incomingObjects.forEach(function (inc) {
    save();
    translateTo(incPosition(inc));
    drawInc(inc);
    restore();
  });

  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  renderCollection(asteroids, drawAsteroid);
  renderCollection(aliens, drawAlien);
  renderCollection(bullets, drawBullet);
  renderCollection(particles, drawParticle);

  save();
  translateTo(spaceship);
  drawSpaceship(spaceship);
  restore();
  restore();
}

raf(render);
