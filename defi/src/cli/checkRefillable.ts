require("dotenv").config();
const protocolToRefill = "Uniswap"

import { getProtocol, getBlocksRetry } from "./utils";
import { getClosestDayStartTimestamp } from "../utils/date";
import { importAdapter } from "../utils/imports/importAdapterJSON";

const secondsInDay = 24 * 3600;

async function calcTvl(
  timestamp: number,
  module: any,
) {
  const { ethereumBlock, chainBlocks } = await getBlocksRetry(timestamp);
  return module.tvl(timestamp, ethereumBlock, chainBlocks)
}

const main = async () => {
  const protocol = getProtocol(protocolToRefill);
  const adapter = await importAdapter(protocol);
  if(adapter.timetravel === false){
    throw new Error("Adapter doesn't support refilling");
  }
  const now = Math.round(Date.now() / 1000);
  let timestamp = getClosestDayStartTimestamp(now);
  if (timestamp > now) {
    timestamp = getClosestDayStartTimestamp(timestamp - secondsInDay);
  }
  const yesterday = timestamp - secondsInDay;
  const [bal1, bal2] = await Promise.all([
    calcTvl(timestamp, module),
    calcTvl(yesterday, module),
  ])
  console.log(bal1, bal2)
};
main();
