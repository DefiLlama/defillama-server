import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start = 1658491200;
const gmx: Protocol = {
  "XVIX and Gambit migration": manualCliff(start, 6_000_000),
  "Uniswap liquidity seed": manualCliff(start, 2_000_000),
  "vesting from Escrowed GMX rewards": manualCliff(start, 2_000_000),
  "floor price fund": manualCliff(start, 2_000_000),
  "marketing, partnerships and community developers": manualCliff(
    start,
    1_000_000,
  ),
  contributors: manualLinear(start, start + periodToSeconds.year * 2, 250_000),
  notes: [
    "Uniswap liquidity seed, vesting from Escrowed GMX rewards, floor price fund and marketing, partnerships and community developer allocations are all released depending on requirements at the time. Here we have used a pessimistic model of instant unlock.",
  ],
  sources: ["https://gmxio.gitbook.io/gmx/tokenomics"],
  token: "arbitrum:0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
};
export default gmx;
