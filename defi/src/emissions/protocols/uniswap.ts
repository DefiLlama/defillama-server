import { manualCliff, manualLinear } from "../adapters/manual";
import { uniswap as community } from "../adapters/uniswap";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

// some missing from uni somewhere
const start = 1600106400;
const uniswap: Protocol = {
  community,
  airdrop: manualCliff(start, 150_000_000),
  "LP staking": manualLinear(
    start,
    start + periodToSeconds.month * 2,
    20_000_000,
  ),
  team: manualLinear(start, start + periodToSeconds.year * 4, 180_440_000),
  investors: manualLinear(start, start + periodToSeconds.year * 4, 180_440_000),
  advisors: manualLinear(start, start + periodToSeconds.year * 4, 6_900_000),
  sources: ["https://uniswap.org/blog/uni"],
  token: "ethereum:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
  protocolIds: ["2196", "2197", "2198"],
};
export default uniswap;
