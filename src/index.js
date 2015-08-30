// Constants
var ctx = c.getContext("2d"),
  raf = requestAnimationFrame,
  GAME_MARGIN = 60,
  W = c.width - 2 * GAME_MARGIN,
  H = c.height - 2 * GAME_MARGIN,
  borderLength = 2*(W+H+2*GAME_MARGIN);

ctx.globalAlpha = 0.5;
ctx.font = "normal 12px sans-serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";

ctx.fillStyle =
ctx.strokeStyle = "#fff";

var t, dt;

// GAME STATE
var spaceship = [ W/2, H/2, 0, 0 ]; // [x, y, rot, vel]
var asteroids = []; // array of [x, y, rot, vel, size, shape]
var aliens = []; // array of [x, y, rot, vel]
var bullets = []; // array of [x, y, rot, vel, life, isAlien]

var incomingObjects = []; // array of: [pos, vel, ang, force, key]

var particles = []; // array of [x, y, rot, vel, life]

var dying = 0;

// TMP data

setInterval(function () {
  var left = Math.random() < 0.5;
  asteroids.push([
    left ? 0 : Math.random()*W,
    !left ? 0 : Math.random()*H,
    7*Math.random(), 0.08 * (0.6 + 0.4 * Math.random()),
    randomAsteroidShape(2), 2
  ]);
}, 200);

incomingObjects.push([ 0, 0.1, 0, 0.1, randomAsteroidShape(2), 65 ]);
incomingObjects.push([ 200, 0.1, 0, 0.1, randomAsteroidShape(2), 66 ]);
incomingObjects.push([ 400, 0.1, 0, 0.1, randomAsteroidShape(2), 67 ]);
incomingObjects.push([ 600, 0.1, 0, 0.1, randomAsteroidShape(2),68 ]);
incomingObjects.push([ 800, 0.1, 0, 0.1, randomAsteroidShape(2), 69 ]);
incomingObjects.push([ 1000, 0.1, 0, 0.1, randomAsteroidShape(2), 70 ]);


// game primitives constructor

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
    var l = 2 * (0.5 + 0.5*Math.random());
    var a = (Math.random() + 2 * Math.PI * i) / n;
    particles.push([
      o[0] + l * Math.cos(a),
      o[1] + l * Math.sin(a),
      a,
      0.04,
      16
    ]);
  }
}

// GAME LOGIC

/*
function euclidPhysics (obj) {
  obj[0] += obj[2] * dt;
  obj[1] += obj[3] * dt;
}
*/

function strokePath (pts) {
  ctx.beginPath();
  for (var i = 0; i<pts.length; ++i) {
    var p = pts[i];
    if (i==0) ctx.moveTo(p[0], p[1]);
    else ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
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
}

function resetSpaceship () {
  spaceship = [W/2, H/2, 0, 0];
}

// AI inputs
var AIshoot = 0, AIboost = 0, AIrotate = 0;

function update () {

  var nbSpaceshipBullets = 0;

  if (dying && t-dying > 2000) {
    dying = 0;
    resetSpaceship();
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
        asteroids.splice(j, 1);
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
        return;
      }
    }
  });

  if (!dying) asteroids.forEach(function (aster) {
    if (circleCollides(aster, spaceship, 10 + 10 * aster[5])) {
      explose(spaceship);
      spaceshipDie();
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


    // apply ai inputs with game logic

    spaceship[3] += AIboost * dt * 0.0002;
    spaceship[2] += AIrotate * dt * 0.005;
    if (nbSpaceshipBullets < 3) {
      if (AIshoot) {
        var x = spaceship[0] + 14 * Math.cos(spaceship[2]);
        var y = spaceship[1] + 14 * Math.sin(spaceship[2]);
        bullets.push([ x, y, spaceship[2], 0.2, 300, 0 ]);
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
  var w = W + GAME_MARGIN;
  var h = H + GAME_MARGIN;
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
  return [ -GAME_MARGIN/2 + x, -GAME_MARGIN/2 + y ];
}

function drawBg () {
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#222";
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
  var pts = o[4];
  ctx.globalAlpha = 1;
  strokePath(pts);
  var sum = [0, 0];
  pts.forEach(function (p) {
    sum[0] += p[0];
    sum[1] += p[1];
  });
  ctx.fillText(String.fromCharCode(o[5]), sum[0]/pts.length, sum[1]/pts.length);
}

function drawParticle (o) {
  ctx.rotate(o[2]);
  ctx.globalAlpha = 0.3;
  strokePath([ [0, 0], [4, 0] ]);
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
