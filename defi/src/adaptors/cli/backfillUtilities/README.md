# Backfill utilities
## How to backfill

- Add your adapter in the exported object in `DefiLlama-Adapters/volumes/index.ts` and wait `defillama-server/defi` to deploy with the new changes
- Run
```
> npm run backfill <type> <adaptername>
```
- Optionally you can backfill only missing days by running 
```
> npm run backfill <type> <adaptername> onlyMissing
```
- You can also optionally backfill only a specific day by running 
```
> npm run backfill <type> <adaptername> <timestamp>
```

The previous commands will run the backfill in the cloud. If you would like to run it locally you can use
```
> npm run backfill-local <type> <adaptername> [onlyMissing]
```

> If there's any kind of rate limit in the API I would recommend you to use the `backfill-local` script and add a delay in `src/triggerStoreVolume.ts` by uncommenting the line `53` (`if (process.env.runLocal === 'true') await delay(1000)`)

- Finally, you should enable the protocol in `src/adaptor/data/<type>/config.ts`

> If the flag `runAtCurrTime` is set to true in the adapter, you won't be able to backfill but by doing the first step (export the adapter) and the last step (enable the dex in `config.ts`) it should show up the next day after the scheduled job stores the daily volume of all adapters (daily at 00:00:01 UTC).

### Improvements
- Currently is not posible to backfill a sigle chain so it will rewrite previous chains when backfilling a new one. This can be manually avoided but ideally should be changed the backfill script to allow backfilling a single chain.
- Backfilling an adapter with a chain with the flag `runAtCurrTime` enabled and other chain with a specific start time will make the first chain backfill with the same value from the specific start time of the other chain.
- When multiple chains. The backfill starts with the oldest start time for all chains. This results in extra queries that we already know there's no data available.

Decided to push later in time this improvements and prioritize other developements. Let me know if u think it's a problem and should be improved!
