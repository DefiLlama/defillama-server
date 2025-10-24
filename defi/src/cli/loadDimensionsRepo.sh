
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR=$SCRIPT_DIR/../..

cd $ROOT_DIR

[ ! -d "dimension-adapters" ] && git clone https://github.com/DefiLlama/dimension-adapters

cd dimension-adapters
git checkout master -q
git pull -q
pnpm install --prefer-offline
git stash -q