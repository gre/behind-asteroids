/* global jsfxr */

function audio (conf) { // eslint-disable-line no-unused-vars
  var audio = new Audio();
  audio.src = jsfxr(conf);
  return audio;
}
function play (a) { // eslint-disable-line no-unused-vars
  a.play();
}
