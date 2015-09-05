
cat src/pre.js

if [ "$NODE_ENV" == "production" ]; then
  cat src/env_prod.js
else
  cat src/env_dev.js
fi;

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

cat src/post.js
