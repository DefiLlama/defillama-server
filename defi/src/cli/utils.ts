import { getBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import { lookupBlock } from "@defillama/sdk/build/util/index";
import protocols from "../protocols/data";
import pThrottle from "../utils/pThrottle";

const throttle = pThrottle({
  limit: 100,
  interval: 1050,
});

const throttleLookupBlock = throttle(lookupBlock);

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

export async function getChainBlocksRetry(timestamp: number, chain: Ecosystem) {
  for (let i = 0; i < 10; i++) {
    try {
      const res: { block: number; timestamp: number } =
        await throttleLookupBlock(timestamp, { chain });
      return {
        ...res,
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
