import { addToDBWritesList, getTokenAndRedirectDataMap } from "./database";
import { getTokenInfo } from "./erc20";
import { Write, CoinData } from "./dbInterfaces";
import { chainsThatShouldNotBeLowerCased } from "../../utils/shared/constants";
import { padAddress } from "../../utils/coingeckoPlatforms";

function normalize(addr: string, chain?: string) {
  if (chain == "starknet") return padAddress(addr.toLowerCase());
  if (!addr || chainsThatShouldNotBeLowerCased.includes(chain as any))
    return addr;
  return addr.toLowerCase();
}

export default async function getWrites(params: {
  chain: string;
  timestamp: number;
  pricesObject: Object;
  writes?: Write[];
  projectName: string;
  confidence?: number;
}) {
  let {
    chain,
    timestamp,
    pricesObject,
    writes = [],
    confidence,
  } = params;
  const entries = Object.entries(pricesObject).map(([token, obj]) => {
    return {
      token: normalize(token, chain),
      price: obj.price,
      underlying: obj.underlying ? normalize(obj.underlying, chain) : undefined,
      symbol: obj.symbol ?? undefined,
      decimals: obj.decimals ?? undefined,
      confidence: obj.confidence ?? confidence,
    };
  });

  const [tokenInfos, coinsData] = await Promise.all([
    getTokenInfo(chain, entries.map((i) => i.token), undefined,),
    getTokenAndRedirectDataMap(entries.map((i) => i.underlying as string).filter((i) => i), chain, timestamp,),
  ]);

  entries.map(
    ({ token, price, underlying, symbol, decimals, confidence }, i) => {
      const finalSymbol = symbol ?? tokenInfos.symbols[i].output;
      const finalDecimals = decimals ?? tokenInfos.decimals[i].output;
      let coinData: CoinData | undefined = coinsData[underlying ?? 'missing'];
      if (!underlying)
        coinData = {
          price: 1,
          confidence: 0.98,
        } as CoinData;
      if (!coinData) return;

      if (!finalDecimals) {
        console.log(`Missing decimals for ${token} on ${chain}, skipping write.`);
        return;
      }

      addToDBWritesList(
        writes,
        chain,
        token,
        coinData.price * price,
        finalDecimals,
        finalSymbol,
        timestamp,
        params.projectName,
        confidence ?? Math.min(0.98, coinData.confidence as number),
      );
    },
  );

  const writesObject: any = {};
  writes.forEach((i: any) => (writesObject[i.symbol] = i.price));
  // sdk.log(chain, writesObject)
  return writes;
}
