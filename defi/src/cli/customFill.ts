require("dotenv").config();

import { getProtocol, } from "./utils";
import { getClosestDayStartTimestamp } from "../utils/date";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import type { Protocol } from "../protocols/data";
import v2Data from './v2Data.json'
import { ChainApi } from "@defillama/sdk";

const log = console.log

/// ---------------- Protocol specific code ----------------- 

const protocolToRefill = 'SUNSwap V2'
const chain = 'tron'

let data = {} as { [key: number]: any }
const adapterModule = {
  misrepresentedTokens: true,
  [chain]: {
    tvl: async (api: ChainApi) => {
      const ts = api.timestamp!;
      if (!data[ts]) throw new Error('Data not found for ' + ts)
      return {
        tether: data[ts]
      }
    }
  }
}

async function fetchData() {
  log('Fetching data for', protocolToRefill)
  v2Data.data.forEach((item: any) => {
    if (+item.liquidity === 0) return;
    const dayTimestamp = getClosestDayStartTimestamp(item.time)
    data[dayTimestamp] = +item.liquidity
  })

}
// ---------------- Protocol specific code ----------------- 

async function getAndStore(
  timestamp: number,
  protocol: Protocol,
) {
  let ethereumBlock = 1e15, chainBlocks = {} // we set ethereum block to absurd number and it will be ignored
  const tvl = await storeTvl(
    timestamp,
    ethereumBlock,
    chainBlocks,
    protocol,
    adapterModule,
    {},
    4,
    false,
    false,
    true,
  );
  console.log(timestamp, new Date(timestamp * 1000).toDateString(), tvl);
}

const main = async () => {
  await fetchData()
  const timestamps = Object.keys(data)
  log('Total days to be filled: ', timestamps.length)
  const protocol = getProtocol(protocolToRefill);

  for (const timestamp of timestamps) {
    await getAndStore(+timestamp, protocol)
  }
};
main().then(() => {
  log('Done!!!')
  process.exit(0)
})
