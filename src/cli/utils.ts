import protocols from "../protocols/data";
import { getBlocks } from "@defillama/sdk/build/computeTVL/blocks";

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
    } catch (e) { }
  }
  throw new Error(`rekt at ${timestamp}`);
}
