# Coins server

## Setup
```bash
aws configure
```

## Development
```bash
npm run build # Build with esbuild & check for type errors
npm test # Run tests
npm run format # Format code
```

### Local dev server
```bash
npm run serve
```

## Deploy
Just push your changes to the `master` branch.

## Run scripts
```bash
export AWS_REGION="eu-central-1" && export tableName="prod-coins-table" && npx ts-node src/cli/writebridges.ts
```
