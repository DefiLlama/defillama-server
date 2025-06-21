# Proff-of-Reserves server

Some protocols locks assets in source chains and issues assets on destination.
The total issued assets should be equal or lesser than locked assets on source chains.
This server does verify these assets.

## Usage

In the `defillama-server/defi` folder:

```bash
# you should always do it to update new codes
git submodule update --init --recursive --remote --merge

# run the checking script locally
npm run check-por wbtc
```
