#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

ROOT_DIR=$SCRIPT_DIR/../..
cd $ROOT_DIR

git submodule update --init --recursive
git submodule update --remote --merge

npm i