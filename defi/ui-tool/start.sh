
#!/bin/bash
echo "Starting restart script... $0, pwd: $(pwd)"
cd $( dirname "$0" )
# echo "Changed directory to: $(pwd)"

SCRIPT_DIR="$(pwd)"
ROOT_DIR=$SCRIPT_DIR/..

function pre_init_server() {
  unset NODE_ENV  # else dev dependencies wont be installed

  echo "Root directory: $ROOT_DIR"
  echo "Node env: $NODE_ENV"

  cd $ROOT_DIR

  # start un-tool server
  echo "current directory: $(pwd)"

  git pull
  git submodule update --init --recursive
  git submodule update --remote --merge

  CURRENT_COMMIT_HASH=$(git rev-parse HEAD)
  echo "$CURRENT_COMMIT_HASH" >  $ROOT_DIR/.current_commit_hash

  echo "Current commit hash: $CURRENT_COMMIT_HASH"

  npm i
  git checkout HEAD -- package-lock.json # reset any changes to package-lock.json
  npm run prebuild

  cd ui-tool
  npm i
  npm run build
}

while true;
do
  time pre_init_server
  export NODE_ENV=production
  export REACT_APP_WSS_PORT=5001
  npm run start-server
  echo "Server stopped. Restarting now..."
done
