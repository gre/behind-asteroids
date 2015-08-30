// Constants
var BLOCKSIZE = 32,
    W = c.width,
    H = c.height,
    ctx = c.getContext("2d"),
    raf = requestAnimationFrame,
    GROUND = 7;

// GAME STATE
var world;
var camera = [ 0, 0 ];
var player = [ 1, 4, 0, 0 ];
var blocks = [];

// user inputs
var keys = {};

// GAME LOGIC

function gen (difficulty) {
  var i, j;
  var w = 20;
  var h = 9;
  world = [ w, h ];
  blocks = [];
  for (i=0; i<h; ++i) {
    blocks.push([ 0, i ]);
    blocks.push([ w-1, i ]);
  }
  for (i=0; i<w; ++i) {
    blocks.push([ i, 0 ]);
    blocks.push([ i, h-1 ]);
  }

    blocks.push([ 4, 6 ]);
    blocks.push([ 5, 6 ]);
}

function physics (o, dt) {
  var i;
  var px = o[0], py = o[1], vx = o[2], vy = o[3];
  var ground = 0, roof = 0, wall = 0;
  vy = Math.min(0.012, vy + dt * 0.00009);
  px += dt * vx;
  py += dt * vy;
  if (py > GROUND) {
    ground = 1;
    py = GROUND;
  }
  for (i=0; i<blocks.length; ++i) {
    var b = blocks[i];
    var dx = px - b[0];
    var dy = py - b[1];
    var nearX = Math.abs(dx) < 1;
    var nearY = Math.abs(dy) < 1;
    if (nearX && nearY) {
      if (nearY) {
        py = dy>0 ? Math.max(py, b[1]+1) : Math.min(b[1]-1, py);
        ground = ground || dy>0;
        roof = roof || dy<0;
      }
    }
  }
  o[0] = px;
  o[1] = py;
  o[3] = vy;
  return [ ground, wall, roof ];
}

var edgeX = 50;

function follow (o) {
  var target = [
    Math.max(0, Math.min(o[0] * BLOCKSIZE - W/2, world[0] * BLOCKSIZE-W)),
    Math.max(0, Math.min(o[1] * BLOCKSIZE - H/2, world[1] * BLOCKSIZE-H))
  ];
  camera[0] += 0.2*(target[0]-camera[0]);
  camera[1] += 0.2*(target[1]-camera[1]);
}

var playerResp = [ 1, 0, 0 ];
function update (t, dt) {
  var controlX = keys[39]-keys[37], controlJump = keys[32];


  if (playerResp[2]) { // roof
    if (player[3]<0) player[3] = 0;
  }

  if (playerResp[0]) { // on the ground / platform
    player[2] = controlX * 0.01;
    if (controlJump) {
      player[3] = -0.023;
    }
  }
  else {
    player[0] += controlX * dt * 0.005;
  }
  playerResp = physics(player, dt);

  follow(player);
}

for (var i=0; i<99; ++i) keys[i] = 0;
document.addEventListener("keydown", function (e) {
  keys[e.which] = 1;
});
document.addEventListener("keyup", function (e) {
  keys[e.which] = 0;
});

// DRAWING

function drawBg () {
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, W, H);
}

function drawPlayer () {
  ctx.fillStyle = "#c31";
  ctx.fillRect(0, 0, BLOCKSIZE, BLOCKSIZE);
}

function drawBlock () {
  ctx.fillStyle = "#388";
  var y = 0;
  for (var yi = 0; yi < 4; ++yi) {
    if (yi % 2) {
      ctx.fillRect( 0, y,  7, 6);
      ctx.fillRect( 9, y, 15, 6);
      ctx.fillRect(26, y,  7, 6);
    }
    else {
      ctx.fillRect( 0, y, 15, 6);
      ctx.fillRect(17, y, 13, 6);
    }
    y += 8;
  }
}

function drawItem (o) {

}

function translateTo (p) {
  ctx.translate(BLOCKSIZE * p[0], BLOCKSIZE * p[1]);
}
function neg (p) {
  return [ -p[0], -p[1] ];
}
function save () {
  ctx.save();
}
function restore () {
  ctx.restore();
}

var lastT;
function render (t) {
  raf(render);
  if (!lastT) lastT = t;
  var dt = t-lastT;
  lastT = t;

  var i;

  update(t, dt);

  save();
  drawBg();

  ctx.translate(-camera[0], -camera[1]);

  for (i=0; i<blocks.length; ++i) {
    save();
    translateTo(blocks[i]);
    drawBlock();
    restore();
  }

  save();
  translateTo(player);
  drawPlayer();
  restore();

  restore();
}

gen(0);
raf(render);
