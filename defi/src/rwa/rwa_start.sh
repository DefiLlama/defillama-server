
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR=$SCRIPT_DIR/../..

cd $ROOT_DIR

CURRENT_COMMIT_HASH=$(git rev-parse HEAD)
echo "$CURRENT_COMMIT_HASH" >  $ROOT_DIR/.current_commit_hash

llama_runner() {
    command_to_run="pnpm run --silent $1"
    # echo "Running npm script: $command_to_run"
    start_time=$(date +%s.%N)
    $command_to_run
    end_time=$(date +%s.%N)
    execution_time=$(awk "BEGIN {print $end_time - $start_time}")
    echo "----|   pnpm script: $1 took $execution_time s"
}

# Check if CUSTOM_GIT_BRANCH_DEPLOYMENT environment variable is set
if [ -n "$CUSTOM_GIT_BRANCH_DEPLOYMENT" ]; then
    echo "***WARNING***: Custom branch deployment requested: $CUSTOM_GIT_BRANCH_DEPLOYMENT"
    # Checkout the specified branch
    git checkout "$CUSTOM_GIT_BRANCH_DEPLOYMENT"  --quiet
    # Pull latest code from the branch
    git pull origin "$CUSTOM_GIT_BRANCH_DEPLOYMENT"  --quiet
# else
    # echo "Using default branch deployment: $(git branch --show-current)"
fi

git pull -q

llama_runner init-defi
llama_runner rwa-cron

# start RWA server
timeout 6m npx pm2 startOrReload src/rwa/ecosystem.config.js
