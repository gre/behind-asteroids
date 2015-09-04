/* global gl, W, H */

function glCreateShader (vert, frag) { // eslint-disable-line no-unused-vars
  var handle, type = gl.VERTEX_SHADER, src = vert;
  handle = gl.createShader(type);
  gl.shaderSource(handle, src);
  gl.compileShader(handle);
  var vertex = handle;

  type = gl.FRAGMENT_SHADER;
  src = frag;
  handle = gl.createShader(type);
  gl.shaderSource(handle, src);
  gl.compileShader(handle);
  var fragment = handle;

  var program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.useProgram(program);
  var p = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  return [program];
}
function glBindShader (shader) { // eslint-disable-line no-unused-vars
  gl.useProgram(shader[0]);
}
function glUniformLocation(shader, name) { // eslint-disable-line no-unused-vars
  return shader[name] || (shader[name] = gl.getUniformLocation(shader[0], name));
}
function glCreateTexture () { // eslint-disable-line no-unused-vars
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}
function glSetTexture (t, value) { // eslint-disable-line no-unused-vars
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, value);
}
function glBindTexture (t, unit) { // eslint-disable-line no-unused-vars
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  return unit;
}
function glCreateFBO () { // eslint-disable-line no-unused-vars
  var handle = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, handle);
  var color = glCreateTexture();
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
  return [handle, color];
}
function glBindFBO (fbo) { // eslint-disable-line no-unused-vars
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[0]);
}
function glGetFBOTexture (fbo) { // eslint-disable-line no-unused-vars
  return fbo[1];
}
