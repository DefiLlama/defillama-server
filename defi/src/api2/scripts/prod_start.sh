
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR=$SCRIPT_DIR/../../..

CURRENT_COMMIT_HASH=$(git rev-parse HEAD)
echo "$CURRENT_COMMIT_HASH" >  $ROOT_DIR/.current_commit_hash

# start API2 server
timeout 8m npx pm2 startOrReload src/api2/ecosystem.config.js
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
    MESSAGE="pm2 command was terminated because it ran for more than 8 minutes."
    handle_error_and_rollback
elif [ $exit_status -ne 0 ]
then
    MESSAGE="pm2 command exited with an error. Exit status: $exit_status"
    handle_error_and_rollback
else
    SAFE_COMMIT_HASH=$(cat "$ROOT_DIR/.safe_commit_hash")
    if [[ $SAFE_COMMIT_HASH != $CURRENT_COMMIT_HASH ]]; then
        MESSAGE="Current commit hash does not match safe commit hash"
        handle_error_and_rollback
    else
        echo "API2 rest server started without issue: $SAFE_COMMIT_HASH"
    fi
fi
