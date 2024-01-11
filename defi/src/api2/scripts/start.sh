#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

ROOT_DIR=$SCRIPT_DIR/../../..
cd $ROOT_DIR

# set up dummy imports
echo 'export default {}' > $ROOT_DIR/src/utils/imports/adapters.ts

npx pm2 start $SCRIPT_DIR/_start.sh --name api2-server
npx pm2 logs api2-server
