/* global MOBILE jsfxr */

function audio (conf) { // eslint-disable-line no-unused-vars
  if (MOBILE) return;
  var audio = new Audio();
  setTimeout(function () { // defer audio load because can take CPU time
    audio.src = jsfxr(conf);
  }, 300);
  return audio;
}
function play (a) { // eslint-disable-line no-unused-vars
  if (MOBILE) return;
  a.play();
}
