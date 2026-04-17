
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR=$SCRIPT_DIR/../../..

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

pull_latest() {
    if [ -n "$CUSTOM_GIT_BRANCH_DEPLOYMENT" ]; then
        echo "***WARNING***: Custom branch deployment requested: $CUSTOM_GIT_BRANCH_DEPLOYMENT"
        git checkout "$CUSTOM_GIT_BRANCH_DEPLOYMENT" --quiet
        git pull origin "$CUSTOM_GIT_BRANCH_DEPLOYMENT" --quiet
    fi
    git pull -q
}

# ── Initial startup ──────────────────────────────────────────────────────────

pull_latest
llama_runner init-defi
llama_runner rwa-perps-cron

# Start RWA Perps server
timeout 6m npx pm2 startOrReload src/rwa/perps/ecosystem.config.js

# ── Recurring loop ───────────────────────────────────────────────────────────

INTERVAL=${RWA_CRON_INTERVAL:-600}
echo "[rwa-perps] Entering recurring loop (interval: ${INTERVAL}s)"

while true; do
    sleep "$INTERVAL"

    echo "[rwa-perps] Cycle start: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

    OLD_HASH=$(git rev-parse HEAD)
    pull_latest
    NEW_HASH=$(git rev-parse HEAD)

    if [ "$OLD_HASH" != "$NEW_HASH" ]; then
        echo "[rwa-perps] New commits detected ($OLD_HASH -> $NEW_HASH), reinstalling deps..."
        llama_runner init-defi
    fi

    llama_runner rwa-perps-cron

    if [ "$OLD_HASH" != "$NEW_HASH" ]; then
        echo "[rwa-perps] Reloading PM2 with new code..."
        timeout 6m npx pm2 startOrReload src/rwa/perps/ecosystem.config.js
    fi

    echo "[rwa-perps] Cycle done: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
done
