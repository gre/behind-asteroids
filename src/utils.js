
// normalize radian angle between -PI and PI (assuming it is not too far)
function normAngle (a) { // eslint-disable-line no-unused-vars
  return a < -Math.PI ? a + 2*Math.PI :
  a>Math.PI ? a - 2*Math.PI : a;
}

function smoothstep (min, max, value) { // eslint-disable-line no-unused-vars
  var x = Math.max(0, Math.min(1, (value-min)/(max-min)));
  return x*x*(3 - 2*x);
}

function scoreTxt (s) { // eslint-disable-line no-unused-vars
  return (s<=9?"0":"")+s;
}

function dist (a, b) { // eslint-disable-line no-unused-vars
  var x = a[0]-b[0];
  var y = a[1]-b[1];
  return Math.sqrt(x * x + y * y);
}

function length (v) { // eslint-disable-line no-unused-vars
  return Math.sqrt(v[0]*v[0]+v[1]*v[1]);
}
