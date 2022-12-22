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
# fetch latest adapters (important to run this before any refilling commands)
npm run updateAdapters

# fill old historical data
npm run fillOld aave # start refilling aave from now and 1 at a time
npm run fillOld aave 1648098107 # start refilling aave from 1648098107 going backwards 1 at a time
npm run fillOld aave now 4 # start refilling aave from now going backwards 4 at a time

# fill old historical data for a given chain
npm run fillOldChain curve ethereum # start recomputing and updating only ethereum tvl of curve from now and 1 at a time
npm run fillOldChain sushiswap polygon,avax 1648098107 # start recomputing and updating only bsc and avax tvl of sushiswap from 1648098107 and 1 at a time
npm run fillOld  sushiswap polygon,avax now 4 # same as above but from now going backwards 4 at a time

# fill latest data point
npm run fillLast aave
```

If you run into the error `Error: Cannot find module '[...]'` then run:
```
npm run prebuild
```

Run general scripts:
```
export AWS_REGION='eu-central-1' && export tableName='prod-table' && npx ts-node src/<script>
```

If you run into problems updating submodule
```
git submodule update --init --recursive
git submodule update --remote --merge
```

To ignore submodule (on git status for example):
```
git config submodule.DefiLlama-Adapters.ignore all
```