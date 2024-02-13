
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR=$SCRIPT_DIR/../../..

SAFE_COMMIT_HASH=$(cat "$ROOT_DIR/.safe_commit_hash")
CURRENT_COMMIT_HASH=$(git rev-parse HEAD)

# start API2 server
npx pm2 start src/api2/ecosystem.config.js || npx pm2 reload >/dev/null
if [ $? -ne 0 ]; then

  MESSAGE="Issue starting API2 server, rolling back to use last successful commit: $SAFE_COMMIT_HASH"

  echo "ERROR: $MESSAGE"

  # notify team on discord that there is an issue
  curl -H "Content-Type: application/json" \
      -X POST \
      -d "{\"content\":\"$MESSAGE\"}" \
      $TEAM_WEBHOOK

  # rollback to safe commit hash if it exists
  if [ -f "$ROOT_DIR/.safe_commit_hash" ]; then

      git stash # stash local changes
      git reset --hard $SAFE_COMMIT_HASH
      echo "$CURRENT_COMMIT_HASH" >  $ROOT_DIR/.current_commit_hash
      npm run prebuild
      npx pm2 start src/api2/ecosystem.config.js || npx pm2 reload >/dev/null

  else
      echo "Could not find safe commit hash file, exiting..."
  fi

  else
    echo "$CURRENT_COMMIT_HASH" >  $ROOT_DIR/.safe_commit_hash
    echo "API2 rest server started without issue: $CURRENT_COMMIT_HASH"
fi 