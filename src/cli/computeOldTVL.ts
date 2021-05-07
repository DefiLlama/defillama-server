import { getBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import { getCoingeckoLock, releaseCoingeckoLock } from "./storeTvlUtils/coingeckoLocks"
import retry from "async-retry";
import Async from "async";
import protocols, { Protocol } from "./protocols/data";
import { storeTvl } from "./storeTvlInterval/getAndStoreTvl";

(async () => {
  const knownBlocks = {}
  const knownTokenPrices = {};

  const timer = setInterval(() => {
    // Rate limit is 100 calls/min for coingecko's API
    // So we'll release one every 0.6 seconds to match it
    releaseCoingeckoLock();
  }, 600);

  for (let i = 0; i < protocols.length; i++) {
    console.log("processing ", protocols[i].name);
    await getProtocolOldTvls(protocols[i], knownTokenPrices, knownBlocks);
    console.log(protocols[i].name, " processed");
  }

  clearInterval(timer);
})()

async function getProtocolOldTvls(protocol: Protocol, knownTokenPrices: any, knownBlocks: any) {
  const module = await import(
    `../../DefiLlama-Adapters/projects/${protocol.module}`
  );

  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)
  const dates = [currentDate.getTime() / 1000];

  let startDate;

  if (module.start) {
    startDate = new Date(module.start * 1000);
  } else {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 60)
  }

  while (currentDate > startDate) {
    currentDate.setDate(currentDate.getDate() - 1)
    dates.push(currentDate.getTime() / 1000)
  }

  return new Promise(async (resolve, reject) => {
    Async.mapLimit(dates, 5, getTimestampTVL(knownBlocks, knownTokenPrices, protocol), (err: any, results: any) => {
      console.log(err, results)
      err ? reject(err) : resolve(results);
    })
  })
}

const getTimestampTVL = (knownBlocks: any, knownTokenPrices: any, protocol: any) => async (unixTimestamp: number) => {
  let blocksData = knownBlocks[unixTimestamp];

  if (!blocksData) {
    blocksData = await getChainsBlocks(unixTimestamp);
    knownBlocks[unixTimestamp] = blocksData;
  }

  await storeTvl(
    unixTimestamp,
    blocksData.ethereumBlock,
    blocksData.chainBlocks,
    protocol,
    knownTokenPrices,
    10,
    getCoingeckoLock
  )

  console.log(protocol, unixTimestamp);
}

async function getChainsBlocks(unixTimestamp: number): Promise<{
  ethereumBlock: number;
  chainBlocks: {
      [chain: string]: number;
  };
}> {
  return retry(() => {
    return getBlocks(unixTimestamp)
  })
}
