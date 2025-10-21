
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR=$SCRIPT_DIR/../..

cd $ROOT_DIR

[ ! -d "DefiLlama-Adapters" ] && git clone https://github.com/DefiLlama/DefiLlama-Adapters

cd DefiLlama-Adapters
git checkout main -q
git pull -q
pnpm install --prefer-offline
git stash -q