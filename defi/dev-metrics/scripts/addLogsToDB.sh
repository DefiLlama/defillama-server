#!/bin/bash

script_dir="$(dirname "$(readlink -f "$0")")"
root_dir="$(dirname "$script_dir")"

function printTitle() {
  echo ""
  echo "======================="
  echo $1
  echo "======================="
  echo ""
}


printTitle "Installing dependencies (parent folder)..."
cd $root_dir/..
# time npm i

printTitle "Installing dependencies..."
cd $root_dir
# time npm i

printTitle "Updating dev mapping from our data.ts files"
time npx ts-node updateDevMapping.ts

printTitle "download toml file data from electric-capital repo"
# time node $script_dir/createMappingFromElectricRepo.js
# time node $script_dir/downloadTomlFile.js

printTitle "Update org/repo details in DB"
time node $script_dir/updateOrgAndRepoInfo.js

printTitle "Pull event logs from git archive"
# time node $script_dir/addArchives.js
