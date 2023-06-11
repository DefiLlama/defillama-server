#!/bin/bash

script_dir="$(dirname "$(readlink -f "$0")")"

function printTitle() {
  echo ""
  echo "======================="
  echo $1
  echo "======================="
  echo ""
}


printTitle "Installing dependencies..."
time npm i

printTitle "Updating dev mapping from our data.ts files"
# time npx ts-node updateDevMapping.ts

printTitle "Create toml file from electric-capital repo"
# time node $script_dir/createMappingFromElectricRepo.js

printTitle "Update org/repo details in DB"
time node $script_dir/updateOrgAndRepoInfo.js

printTitle "Pull event logs from git archive"
time node $script_dir/addArchives.js
