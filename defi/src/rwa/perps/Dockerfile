FROM node:20-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY defi/package.json defi/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN cd defi && pnpm run init-defi || true

EXPOSE 5003

CMD ["node", "-r", "ts-node/register", "--max-old-space-size=4096", "defi/src/rwa/perps/server.ts"]
