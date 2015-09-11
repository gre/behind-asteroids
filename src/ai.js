/* global
AIrotate: true
AIboost: true
AIshoot: true
AIexcitement: true
spaceship
t dt
asteroids
W H
dist normAngle
ufos
playingSince
*/

var closestAsteroidMemory, targetAsteroidMemory, closestAsteroidMemoryT, targetAsteroidMemoryT;

// AI states
// q1 and q2 are 2 quality expertise of the player
function aiLogic (q1, q2) { // set the 3 AI inputs (rotate, shoot, boost)
  var x, y, i, ang;
  var prevRot = AIrotate;
  var prevBoost = AIboost;
  AIrotate = 0;
  AIshoot = 0;
  AIboost = 0;

  // first part is data extraction / analysis

  var ax = Math.cos(spaceship[4]);
  var ay = Math.sin(spaceship[4]);
  var vel = Math.sqrt(spaceship[2]*spaceship[2]+spaceship[3]*spaceship[3]);

  var deltaMiddle = [W/2-spaceship[0], H/2-spaceship[1]];
  var distMiddle = length(deltaMiddle);
  var angMiddle = Math.atan2(deltaMiddle[1], deltaMiddle[0]);

  var pred = 100 + (500 + 500 * q1) * Math.random();
  var predSpaceship = [
    spaceship[0] + pred * spaceship[2],
    spaceship[1] + pred * spaceship[3]
  ];

  var danger = 0;
  var closestAsteroid, closestAsteroidPredDist;
  var targetAsteroid, targetAsteroidWeight;

  if (closestAsteroidMemory &&
    asteroids.indexOf(closestAsteroidMemory)!=-1 &&
    t - closestAsteroidMemoryT < 80 * Math.random()) {
    closestAsteroid = closestAsteroidMemory;
  }
  if (targetAsteroidMemory &&
    asteroids.indexOf(targetAsteroidMemory)!=-1 &&
    t - targetAsteroidMemoryT < 80 * Math.random()) {
    targetAsteroid = targetAsteroidMemory;
  }

  for (i = 0; i < asteroids.length; ++i) {
    var a = asteroids[i];
    if (!(a[0]<0 || a[1]<0 || a[0]>W || a[1]>H)) {
      var aPred = [].concat(a);
      aPred[0] += Math.cos(a[2]) * a[3] * pred;
      aPred[1] += Math.sin(a[2]) * a[3] * pred;
      var curDist = dist(a, spaceship) - (10 + 10 * a[5]);
      var predDist = dist(aPred, predSpaceship) - (10 + 10 * a[5]);
      if (curDist - predDist > pred / 200 && // approaching
        (curDist < 80 || predDist < 30 + 30 * q2)) {
        // imminent collision
        if (!closestAsteroid || predDist < closestAsteroidPredDist) {
          closestAsteroid = a;
          targetAsteroid = a;
          closestAsteroidPredDist = predDist;
          danger ++;
        }
      }
    }

    if (!(a[5] > 2 && curDist < 30) || predDist < 100) {
      var w = a[5];
      if (!closestAsteroid || w < targetAsteroidWeight) {
        targetAsteroid = aPred;
        targetAsteroidWeight = w;
      }
    }
  }

  for (i = 0; i < ufos.length; ++i) {
    var u = ufos[i];
    if (Math.random() < 0.02 * dt * (q1+q2+1)) {
      targetAsteroid = u;
    }
  }

  // utility

  function opp (dx, dy) { // going opposite of a vector based on current head direction
    return (ax > ay) ?
      ((ax<0)==(dx<0) ? -1 : 1) :
      ((ay<0)==(dy<0) ? -1 : 1);
  }

  AIexcitement =
    (1 - Math.exp(-asteroids.length/10)) + // total asteroids
    (1 - Math.exp(-danger/3)) // danger
  ;

  // Now we implement the spaceship reaction
  // From the least to the most important reactions


  // Random changes

  AIshoot = playingSince > 3000 && Math.random() < 0.0001*dt*AIexcitement;

  AIrotate = (playingSince > 1000 && Math.random()<0.005*dt) ?
    (Math.random()<0.5 ? 0 : Math.random()<0.5 ? 1 : -1) :
    prevRot;

  AIboost = (playingSince > 2000 && Math.random()<0.005*dt*(1-q1)) ?
    (Math.random()<0.5 ? 1 : -1) :
    prevBoost;


  // trying to avoid edges

  if (distMiddle > 100 - 80 * q2) {
    ang = normAngle(angMiddle-spaceship[4]);
    if (Math.abs(ang) > 2*Math.PI/3) {
      AIboost = -1;
    }
    else if (Math.abs(ang) > Math.PI/3) {
      AIrotate = ang<0 ? -1 : 1;
    }
    else {
      AIboost = 1;
    }
  }

  if (Math.random()<0.1 && vel < 0.1) {
  // minimal move
    AIboost = 1;
  }
  // Slowing down
  else if (
    -Math.exp(-distMiddle/80) + // slow down if middle
    Math.exp(-vel) + // slow down if velocity
    (1-2*q1) * AIexcitement * Math.random() // excitement make it not slowing down
    < Math.random()) {
    AIboost = opp(spaceship[2], spaceship[3]);
  }

  if (closestAsteroid && q1>Math.random()-0.02*dt) {
    x = closestAsteroid[0]-spaceship[0];
    y = closestAsteroid[1]-spaceship[1];
    AIboost = opp(x, y);
    closestAsteroidMemory = closestAsteroid;
    closestAsteroidMemoryT = t;
  }

  if (targetAsteroid && q2>Math.random()-0.01*dt) {
    x = targetAsteroid[0]-spaceship[0];
    y = targetAsteroid[1]-spaceship[1];
    ang = normAngle(Math.atan2(y, x)-spaceship[4]);
    var angabs = Math.abs(ang);
    if (Math.random() < 0.06*dt*angabs) AIrotate = ang > 0 ? 1 : -1;
    AIshoot = Math.random() < 0.005 * dt * (Math.exp(-angabs*10) + AIexcitement + q1);
    targetAsteroidMemory = targetAsteroid;
    targetAsteroidMemoryT = t;
  }
}
