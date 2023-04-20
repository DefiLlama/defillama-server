import { api, blocks } from "@defillama/sdk";
import { getCurrentUnixTimestamp } from "../../utils/date";
import fetch from "node-fetch";

export default async function getBlock(chain: any, timestamp: number) {
  if (chain == "era") {
    try {
      return (
        await fetch(
          `https://coins.llama.fi/block/${chain}/${
            timestamp == 0 ? getCurrentUnixTimestamp() : timestamp
          }`,
        ).then((res: any) => res.json())
      ).height;
    } catch {
      throw new Error(`unable to find era block height at this timestamp`);
    }
  }
  if (timestamp == 0)
    return (await blocks.getCurrentBlocks([chain])).chainBlocks[chain];
  return api.util
    .lookupBlock(timestamp, { chain })
    .then((blockData) => blockData.block);
}
