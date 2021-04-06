# defillama-server

## Setup
```bash
aws configure
```

## Development
```bash
npm run build # Build with webpack & check for type errors
npm test # Run tests
npm run format # Format code
```

### Local dev server
```bash
npm run serve
```

## Deploy
Just push your changes to the `master` branch.

## Cli
```
npx esm-ts-node src/import.ts
```