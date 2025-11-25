
#!/bin/bash
echo "Starting restart script... $0, pwd: $(pwd)"
cd $( dirname "$0" )
# echo "Changed directory to: $(pwd)"

SCRIPT_DIR="$(pwd)"
ROOT_DIR=$SCRIPT_DIR/..

# Check if CUSTOM_GIT_BRANCH_DEPLOYMENT environment variable is set
if [ -n "$CUSTOM_GIT_BRANCH_DEPLOYMENT" ]; then
    echo "***WARNING***: Custom branch deployment requested: $CUSTOM_GIT_BRANCH_DEPLOYMENT"
    # Checkout the specified branch
    git checkout "$CUSTOM_GIT_BRANCH_DEPLOYMENT"
    # Pull latest code from the branch
    git pull origin "$CUSTOM_GIT_BRANCH_DEPLOYMENT"
# else
    # echo "Using default branch deployment: $(git branch --show-current)"
fi


function pre_init_server() {
  unset NODE_ENV  # else dev dependencies wont be installed

  echo "Root directory: $ROOT_DIR"
  echo "Node env: $NODE_ENV"

  cd $ROOT_DIR

  # start un-tool server
  echo "current directory: $(pwd)"
  
  git pull -q
  pnpm -s run load-all-repos
  pnpm -s run init-defi

  CURRENT_COMMIT_HASH=$(git rev-parse HEAD)
  echo "$CURRENT_COMMIT_HASH" >  $ROOT_DIR/.current_commit_hash

  echo "Current commit hash: $CURRENT_COMMIT_HASH"


  cd ui-tool
  pnpm i
  export REACT_APP_WSS_PORT=5001
  pnpm run cached_build
}

while true;
do
  time pre_init_server
  export NODE_ENV=production
  export REACT_APP_WSS_PORT=5001
  npm run start-server
  echo "Server stopped. Restarting now..."
done
