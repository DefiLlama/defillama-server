import { api, blocks } from "@defillama/sdk";

export default async function getBlock(chain: any, timestamp: number) {
  if (timestamp == 0) return (await blocks.getCurrentBlocks([chain])).chainBlocks[chain];
  return api.util
    .lookupBlock(timestamp, { chain })
    .then((blockData) => blockData.block);
}
