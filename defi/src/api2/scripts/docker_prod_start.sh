
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR=$SCRIPT_DIR/../../..

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
llama_runner cron-raises
llama_runner cron-tvl
llama_runner cron-dimensions
llama_runner cron-app-metadata
llama_runner cron-cex

# start API2 server
timeout 6m npx pm2 startOrReload src/api2/ecosystem.config.js
exit_status=$?

handle_error_and_rollback() {
  cd $ROOT_DIR
  npx pm2 logs --nostream --lines 250
  SAFE_COMMIT_HASH=$(cat "$ROOT_DIR/.safe_commit_hash")
  MESSAGE_2="$MESSAGE | rolling back to use last successful commit: $SAFE_COMMIT_HASH. Current: $CURRENT_COMMIT_HASH"
  echo "ERROR: $MESSAGE_2"

  # notify team on discord that there is an issue
  curl -H "Content-Type: application/json" \
      -X POST \
      -d "{\"content\":\"[API2-rest-server] $MESSAGE_2\"}" \
      $TEAM_WEBHOOK

  # rollback to safe commit hash if it exists
  if [ -f "$ROOT_DIR/.safe_commit_hash" ]; then
      git stash # stash local changes
      git reset --hard $SAFE_COMMIT_HASH
      echo "$CURRENT_COMMIT_HASH" >  $ROOT_DIR/.current_commit_hash
      npm run prebuild
      npx pm2 startOrReload src/api2/ecosystem.config.js
  else
      echo "Could not find safe commit hash file, exiting..."
  fi
}

if [ $exit_status -eq 124 ]
then
    MESSAGE="pm2 command was terminated because it ran for more than 4 minutes."
    time handle_error_and_rollback
elif [ $exit_status -ne 0 ]
then
    MESSAGE="pm2 command exited with an error. Exit status: $exit_status"
    time handle_error_and_rollback
else
    SAFE_COMMIT_HASH=$(cat "$ROOT_DIR/.safe_commit_hash")
    if [[ $SAFE_COMMIT_HASH != $CURRENT_COMMIT_HASH ]]; then
        MESSAGE="Current commit hash does not match safe commit hash"
        time handle_error_and_rollback
    else
        echo "API2 rest server started without issue: $SAFE_COMMIT_HASH"
    fi
fi
