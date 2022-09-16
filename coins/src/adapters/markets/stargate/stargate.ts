import { multiCall } from "@defillama/sdk/build/abi/index";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write, Read } from "../../utils/dbInterfaces";
import { Result } from "../../utils/sdkInterfaces";
import getBlock from "../../utils/block";
import contracts from "./contracts.json";
import { getGasTokenBalance, wrappedGasTokens } from "../../utils/gasTokens";
const gasTokenDummyAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

async function processDbData(underlyingBalances: Result[], coinsData: Read[]) {
  return underlyingBalances.map((b: Result) => {
    const coinData: Read = coinsData.filter((c: Read) =>
      c.dbEntry.PK.includes(b.input.target.toLowerCase())
    )[0];
    if (coinData == undefined) return;

    const price: number =
      coinData.redirect.length != 0
        ? coinData.redirect[0].price
        : coinData.dbEntry.price;

    const confidence: number =
      coinData.redirect.length != 0
        ? coinData.redirect[0].confidence
        : coinData.dbEntry.confidence;

    return {
      price,
      decimals: coinData.dbEntry.decimals,
      confidence,
      PK: coinData.dbEntry.PK
    };
  });
}
function formWrites(
  underlyingTokenData: any[],
  pools: { [pool: string]: { [address: string]: string } },
  chain: string,
  underlyingBalances: Result[],
  tokenInfos: any,
  writes: Write[],
  timestamp: number
) {
  underlyingTokenData.map((d: any, i: number) => {
    if (d == undefined) return;

    const j = Object.values(pools).indexOf(
      Object.values(pools).filter((p: any) =>
        d.PK.includes(
          p.underlying == gasTokenDummyAddress
            ? wrappedGasTokens[chain]
            : p.underlying
        )
      )[0]
    );
    if (j == -1) return;

    const price =
      d.price * (underlyingBalances[i].output / tokenInfos.supplies[j].output);

    addToDBWritesList(
      writes,
      chain,
      Object.values(pools)[j].pool,
      price,
      tokenInfos.decimals[j].output,
      tokenInfos.symbols[j].output,
      timestamp,
      "stargate",
      d.confidence
    );
  });
  return writes;
}
export default async function getTokenPrices(chain: string, timestamp: number) {
  const writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);
  const pools: { [pool: string]: { [address: string]: string } } =
    contracts[chain as keyof typeof contracts];

  let underlyingBalances: Result[];
  let tokenInfos: any;
  [{ output: underlyingBalances }, tokenInfos] = await Promise.all([
    multiCall({
      abi: "erc20:balanceOf",
      calls: Object.entries(pools).map((p: any) => ({
        target: p[1].underlying,
        params: p[1].pool
      })),
      chain: chain as any,
      block
    }),
    getTokenInfo(
      chain,
      Object.entries(pools).map((p: any) => p[1].pool),
      block,
      true
    )
  ]);

  await Promise.all(
    Object.entries(pools)
      .filter((p: any) => p[1].underlying == gasTokenDummyAddress)
      .map((p: any) =>
        getGasTokenBalance(chain, p[1].pool, underlyingBalances, block)
      )
  );

  let coinsData: Read[] = await getTokenAndRedirectData(
    Object.entries(pools).map((p: any) =>
      p[1].underlying == gasTokenDummyAddress
        ? wrappedGasTokens[chain]
        : p[1].underlying
    ),
    chain,
    timestamp
  );

  const underlyingTokenData = await processDbData(
    underlyingBalances,
    coinsData
  );

  return formWrites(
    underlyingTokenData,
    pools,
    chain,
    underlyingBalances,
    tokenInfos,
    writes,
    timestamp
  );
}
