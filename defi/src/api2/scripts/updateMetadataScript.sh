#!/bin/bash

script_dir="$(dirname "$(readlink -f "$0")")"

git pull
git submodule update --init --recursive
git submodule update --remote --merge
npm i

ts-node $script_dir/updateMetadata.ts
node $script_dir/updateMetadataExtra.js