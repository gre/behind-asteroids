
cat src/env.js
cat src/path.js
cat src/font.js
cat src/webgl-utils.js
cat src/jsfxr.js

cd build;
for glsl in *.vert *.frag; do
  name=`echo $glsl | tr '.' '_' | tr '[:lower:]' '[:upper:]'`
  cat $glsl | ../scripts/wrapjs.sh $name
done
cd ..;

cat src/index.js
