## Refill all protocols
1. Make sure that the env variable ACCOUNTS_DB is set in your .env file
2. Modify defi/dimension-adapters/users/routers/routerAddresses.ts and filter it so only the protocols you want to refill are left
3. Run the following commands:

```
npx ts-node src/cli/users/refillChainGas.ts
npx ts-node src/cli/users/refillChainTxs.ts
npx ts-node src/cli/users/refillChainUsers.ts
npx ts-node src/cli/users/refillUsers.ts
```

## Refill a single protocol
This will destroy all info of the protocol before refilling it, so be cautious.

```
npx ts-node src/cli/users/refillSingleProtocol.ts velodrome
```