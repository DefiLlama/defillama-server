# Use an official Node.js runtime as a parent image
FROM node:20
# Install pnpm globally
RUN npm install -g pnpm
ARG CUSTOM_GIT_BRANCH_DEPLOYMENT
ENV CUSTOM_GIT_BRANCH_DEPLOYMENT=${CUSTOM_GIT_BRANCH_DEPLOYMENT}


# Set the working directory in the container to /app
WORKDIR /app

# Clone your repo
RUN git clone https://github.com/DefiLlama/defillama-server /app/repo


# Check if CUSTOM_GIT_BRANCH_DEPLOYMENT is set and checkout that branch if it exists
RUN if [ -n "$CUSTOM_GIT_BRANCH_DEPLOYMENT" ]; then \
  cd /app/repo && \
  echo "Checking out branch: $CUSTOM_GIT_BRANCH_DEPLOYMENT" && \
  git checkout $CUSTOM_GIT_BRANCH_DEPLOYMENT; \
  fi


# Change to the directory of your repo
WORKDIR /app/repo/defi

# RUN git checkout api-v2-dimensions

# Make port 5001 available to the world outside this container
EXPOSE 5001

# bash command to keep the container running
CMD ["bash", "-c", "bash src/api2/scripts/docker_prod_start.sh; while true; do sleep 10000; done"]