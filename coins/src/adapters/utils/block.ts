import { api } from "@defillama/sdk";
import { getCurrentUnixTimestamp } from "./../../utils/date";

export default async function getBlock(
  chain: any,
  timestamp: number = getCurrentUnixTimestamp()
) {
  return api.util
    .lookupBlock(timestamp, { chain })
    .then((blockData) => blockData.block);
}
