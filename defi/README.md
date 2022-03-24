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

## Filling data
```
npm run updateAdapters # fetch latest adapters
npm run fillOld # fill old historical data
npm run fillLast # fill latest data point
```

If you run into the error `Error: Cannot find module '[...]'` then run:
```
npm run prebuild
```
