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

# Make port 5003 available to the world outside this container
EXPOSE 5003

# Start script runs initial setup then loops (git pull + cron + PM2 reload)
CMD ["bash", "src/rwa/perps/rwa_perps_start.sh"]
