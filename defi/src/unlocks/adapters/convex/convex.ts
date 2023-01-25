import { call } from "@defillama/sdk/build/abi/abi2";
import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";
import { periodToSeconds } from "../../utils/time";

const cliffQty = 100_000 * 1e18;
const cliffCount = 1000;
const maxSupply = 100_000_000 * 1e18;

export default async function convex(
  chain: any,
  target: string,
  start: number,
) {
  let emission = 1;
  let timestamp = start;
  const results = [];

  while (emission > 0) {
    emission = await getCvxEmitted(chain, target, timestamp);
    results.push(await getCvxEmitted(chain, target, timestamp));
    timestamp += periodToSeconds.day;
  }
  return [];
  return results;
}
async function getCrvEarned(): Promise<number> {
  return 1;
}
async function getCvxEmitted(
  chain: any,
  target: string,
  timestamp: number,
): Promise<number> {
  const block = await getBlock(chain, timestamp);
  const [cvxSupply, crvEarned] = await Promise.all([
    call({
      target,
      chain,
      abi: "erc20:totalSupply",
      block,
    }),
    getCrvEarned(),
  ]);
  const currentCliff = cvxSupply / cliffQty;
  if (cliffCount < currentCliff) return 0;
  const remaining = cliffCount - currentCliff;
  const cvxEarned = (crvEarned * remaining) / cliffCount;
  let amountTillMax = maxSupply - cvxSupply;
  return cvxEarned > amountTillMax ? cvxEarned : amountTillMax;
}
