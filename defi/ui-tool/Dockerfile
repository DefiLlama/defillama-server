# Use an official Node.js runtime as a parent image
FROM node:20

# Set the working directory in the container to /app
WORKDIR /app

# Clone your repo
RUN git clone https://github.com/DefiLlama/defillama-server /app/repo

# Change to the directory of your repo
WORKDIR /app/repo/defi/ui-tool

# RUN git checkout api-v2-dimensions

# Make port 5001 available to the world outside this container
EXPOSE 5001

# bash command to keep the container running
CMD ["bash", "start.sh"]