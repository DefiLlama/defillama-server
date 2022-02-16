import { getBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import { lookupBlock } from "@defillama/sdk/build/util/index";
import { getEcosystemBlocks } from "../dexVolumes/utils";
import protocols from "../protocols/data";
import pThrottle from "../utils/pThrottle";

import { Ecosystem } from "../dexVolumes/dexVolume.types";

export function getProtocol(name: string) {
  const protocol = protocols.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (protocol === undefined) {
    throw new Error("No protocol with that name");
  }
  return protocol;
}

export async function getBlocksRetry(timestamp: number) {
  for (let i = 0; i < 10; i++) {
    try {
      return await getBlocks(timestamp);
    } catch (e) {
      console.log(e);
    }
  }
  throw new Error(`Couldn't get the block numbers at timestamp ${timestamp}`);
}

export async function getEthBlock(timestamp: number) {
  return {
    ethereumBlock: (await lookupBlock(timestamp, { chain: "ethereum" })).block,
    chainBlocks: {},
  };
}

export async function getChainBlocksRetry(
  timestamp: number,
  chain: Ecosystem,
  limit = 1000
) {
  const throttle = pThrottle({
    limit,
    interval: 60000,
  });

  const throttleGetEcosystemBlock: any = throttle(getEcosystemBlocks);

  for (let i = 0; i < 10; i++) {
    try {
      const res: { height: number; timestamp: number } =
        await throttleGetEcosystemBlock(chain, timestamp);
      return {
        block: res.height,
        timestamp: res.timestamp,
        inputTimestamp: timestamp,
      };
    } catch (e) {
      console.log(e);
    }
  }
  throw new Error(`Couldn't get the block numbers at timestamp ${timestamp}`);
}

export const date = (timestamp: number) =>
  "\t" + new Date(timestamp * 1000).toDateString();
