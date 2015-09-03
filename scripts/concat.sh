
cat src/jsfxr.js

cd build;
for glsl in *.vert *.frag; do
  name=`echo $glsl | tr '.' '_' | tr '[:lower:]' '[:upper:]'`
  cat $glsl | ../scripts/wrapjs.sh $name
done
cd ..;

browserify src/libs.js # TEMPORARY

cat src/index.js
