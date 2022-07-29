import { api } from "@defillama/sdk";

export default async function getBlock(chain: any, timestamp: number) {
  if (timestamp == 0) return undefined;
  return api.util
    .lookupBlock(timestamp, { chain })
    .then((blockData) => blockData.block);
}
