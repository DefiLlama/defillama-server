
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR=$SCRIPT_DIR/..


CURRENT_COMMIT_HASH=$(git rev-parse HEAD)
echo "$CURRENT_COMMIT_HASH" >  $ROOT_DIR/.current_commit_hash

git pull
git submodule update --init --recursive
git submodule update --remote --merge

npm i
git checkout HEAD -- package-lock.json # reset any changes to package-lock.json


npm run prebuild
cd $ROOT_DIR/ui-tool
npm i
cd ..

# start API2 server
timeout 6m npx pm2 startOrReload ui-tool/ecosystem.config.js