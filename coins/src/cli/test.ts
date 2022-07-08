import { getPairPrices } from "../adapters/lps/uniswap/uniswap";
import { getTokenPrices as curve } from "../adapters/lps/curve/curve";
import { getTokenPrices as yearn } from "../adapters/yield/yearn/yearnV2";
import { getTokenPrices as aave } from "../adapters/moneyMarkets/aave/aaveV2";
async function main() {
  //   await getPairPrices(
  //     "bsc",
  //     "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
  //     "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2"
  //   );

  await Promise.all([
    curve("ethereum")
    //aave("ethereum"),
    //yearn("ethereum")
  ]);
}
main();
// ts-node coins/src/cli/test.ts
