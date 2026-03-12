#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

ROOT_DIR=$SCRIPT_DIR/../..
cd $ROOT_DIR

pnpm i