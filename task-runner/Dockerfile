# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY ./src ./src

# Clone the GitHub repository
RUN git clone --depth 1  https://github.com/DefiLlama/defillama-server /app/repo
RUN cd /app/repo/defi && git submodule update --init --recursive
# RUN cd /app/repo/defi && git submodule update --remote --merge 
RUN cd /app/repo/defi && npm i

# Run the app when the container starts
CMD ["node", "src/app.js"]
