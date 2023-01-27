import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";

const secondsPerBlock = {
  ethereum: 12,
};
export async function estimateBlockHeight(timestamp: number, chain: any) {
  const current = await getBlock(chain);
  return (
    current.number +
    (current.timestamp - timestamp) /
      secondsPerBlock[chain as keyof typeof secondsPerBlock]
  );
}
export async function estimateBlockTimestamp(height: number, chain: any) {
  const current = await getBlock(chain);
  return (
    current.timestamp -
    (current.number - height) *
      secondsPerBlock[chain as keyof typeof secondsPerBlock]
  );
}
