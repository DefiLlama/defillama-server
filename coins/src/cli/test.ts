import getTokenPrices from "../adapters/moneyMarkets/compound/compound";
const lastWeek = 1658357999;
async function main() {
  await getTokenPrices(
    "ethereum",
    "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b",
    lastWeek
  );
  // "bsc",
  // "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
  // "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2"
}
main();

// ts-node coins/src/cli/test.ts
