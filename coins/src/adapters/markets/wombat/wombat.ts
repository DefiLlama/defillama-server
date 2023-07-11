import { ChainApi } from "@defillama/sdk";
import { CoinData, DbTokenInfos, Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import abi from "./abi.json";
import { getCurrentUnixTimestamp } from "../../../utils/date";
import { getTokenInfo } from "../../utils/erc20";

export default async function getTokenPrices(
  timestamp: number,
  chain: string,
  contracts: { [contract: string]: any },
): Promise<Write[]> {
  const writes: Write[] = [];
  const swapQty: number = 1e12;

  const api: ChainApi = await getApi(
    chain,
    timestamp ? timestamp : getCurrentUnixTimestamp(),
  );

  const poolTokens = await multiCall({
    abi: abi.getTokens,
    calls: contracts.markets.map((target: string) => ({ target })),
    chain,
    block: api.block,
  });

  const poolTokenData = await getTokenAndRedirectData(
    poolTokens.flat(),
    chain,
    timestamp,
  );

  const pricedAddresses: { [address: string]: number | undefined } = {};
  poolTokenData.map(
    (p: CoinData) => (pricedAddresses[p.address] = p.confidence),
  );

  const calls: any[] = [];
  poolTokens.map((tokens: string[], i: number) => {
    let pricedToken: { address: string; confidence: number } = {
      address: "",
      confidence: 0,
    };
    let unpricedToken: string | undefined;

    tokens.map((t: string) => {
      const conf = pricedAddresses[t.toLowerCase()];
      if (conf && pricedToken.confidence < conf) {
        pricedToken = { address: t.toLowerCase(), confidence: conf };
      } else if (unpricedToken == null) {
        unpricedToken = t.toLowerCase();
      }
    });

    calls.push({
      target: contracts.markets[i],
      params: [pricedToken.address, unpricedToken, swapQty],
    });
  });

  const swapRates: any[] = await multiCall({
    abi: abi.quotePotentialSwap,
    calls,
    chain,
    block: api.block,
    withMetadata: true,
  });

  const unpricedTokenInfo: DbTokenInfos = await getTokenInfo(
    chain,
    calls.map((c: any) => c.params[1]),
    Number(api.block),
  );

  swapRates.map((r: any, i: number) => {
    const referenceTokenIndex = Object.keys(pricedAddresses).indexOf(
      r.input.params[0],
    );
    const referenceTokenPrice = poolTokenData[referenceTokenIndex].price;
    const price = (referenceTokenPrice * swapQty) / r.output.potentialOutcome;

    addToDBWritesList(
      writes,
      chain,
      r.input.params[1],
      price,
      unpricedTokenInfo.decimals[i].output,
      unpricedTokenInfo.symbols[i].output,
      timestamp,
      "wombat",
      0.8,
    );
  });

  return writes;
}
