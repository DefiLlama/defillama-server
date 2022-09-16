### How to backfill

- Add your adapter in the exported object in `DefiLlama-Adapters/volumes/index.ts` and wait `defillama-server/defi` to deploy with the new changes
- Navigate to defillama-server/defi and run the following two commands
```
> git submodule update --remote --merge
> npm run prebuild
```
- Run `npm run backfill-dex <adaptername>`
- Optionally you can backfill only missing days by running `npm run backfill-dex <adaptername> --onlyMissing`