import getBlock from "../utils/block";
import { getTokenInfo } from "../utils/erc20";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { getR2JSONString } from "../../utils/r2";
import PromisePool from "@supercharge/promise-pool";

const r2Key = "distressedAssetsList.json";

export default async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const assets = await getR2JSONString(r2Key);

  await PromisePool.withConcurrency(5)
    .for(Object.keys(assets))
    .process(async (chain) => {
      const block: number | undefined = await getBlock(chain, timestamp);

      if (chain == "coingecko") {
        assets[chain].map((id: string) => {
          writes.push(
            {
              PK: `coingecko#${id}`,
              SK: 0,
              confidence: 1.01,
              price: 0,
              symbol: "-",
              adapter: "distressed",
              timestamp: timestamp == 0 ? getCurrentUnixTimestamp() : timestamp,
            },
            {
              PK: `coingecko#${id}`,
              SK: timestamp,
              confidence: 1.01,
              price: 0,
              adapter: "distressed",
            }
          );
        });
      } else {
        const tokenInfos = await getTokenInfo(chain, assets[chain], block);
        assets[chain].map((a: string, i: number) => {
          addToDBWritesList(
            writes,
            chain,
            a,
            0,
            tokenInfos.decimals[i].output ?? 0,
            tokenInfos.symbols[i].output ?? "-",
            timestamp,
            "distressed",
            1.01
          );
        });
      }
    });

  return writes;
}