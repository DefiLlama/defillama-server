# Use an official Node.js runtime as a parent image
FROM node:24-bookworm

# Set the working directory in the container to /app
WORKDIR /app

# Clone your repo
RUN git clone https://github.com/DefiLlama/defillama-server /app/repo

# Change to the directory of your repo
WORKDIR /app/repo/defi/ui-tool

# RUN git checkout api-v2-dimensions

# Make port 5001, 8080 available to the world outside this container
EXPOSE 5001
EXPOSE 8080

# bash command to keep the container running
CMD ["bash", "-c", "bash start.sh; while true; do sleep 10000; done"]