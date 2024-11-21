import getBlock from "../utils/block";
import { getTokenInfo } from "../utils/erc20";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { contracts } from "./distressed";

export default async function getTokenPrices(chain: string, timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const writes: Write[] = [];

  if (chain == "coingecko") {
    const symbols = Object.keys(contracts[chain]);
    symbols.map((s: string) => {
      writes.push(
        {
          PK: `coingecko#${contracts[chain][s]}`,
          SK: 0,
          confidence: 1.01,
          price: 0,
          symbol: s,
          adapter: "distressed",
          timestamp: timestamp == 0 ? getCurrentUnixTimestamp() : timestamp,
        },
        {
          PK: `coingecko#${contracts[chain][s]}`,
          SK: timestamp,
          confidence: 1.01,
          price: 0,
          adapter: "distressed",
        },
      );
    });
  } else {
    const tokens = Object.values(contracts[chain]);
    const tokenInfos = await getTokenInfo(chain, tokens, block);
    tokens.map((a: string, i: number) => {
      addToDBWritesList(
        writes,
        chain,
        a,
        0,
        tokenInfos.decimals[i].output ?? 0,
        tokenInfos.symbols[i].output ?? "-",
        timestamp,
        "distressed",
        1.01,
      );
    });
  }

  return writes;
}
