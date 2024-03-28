#!/bin/bash

script_dir="$(dirname "$(readlink -f "$0")")"

echo "Script directory: $script_dir"

while true; do
  # Run your process in the background
  echo "Running process..."
  # Replace the command below with your actual process
  # Example: ./your_process.sh &
  node $script_dir/addArchives.js &

  # Sleep for 12 minutes
  sleep 720

  # Kill the running process
  echo "Stopping process..."
  pkill -f addArchives

  # Sleep for 4 minutes
  sleep 240
done
