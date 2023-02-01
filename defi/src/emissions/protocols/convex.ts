import { lpRewards } from "../adapters/convex";
import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const deployTime = 1621242000;
const curve: Protocol = {
  investors: manualLinear(
    deployTime,
    deployTime + periodToSeconds.year,
    3_300_000,
    0,
  ),
  treasury: manualLinear(
    deployTime,
    deployTime + periodToSeconds.year,
    9_700_000,
    0,
  ),
  team: manualLinear(
    deployTime,
    deployTime + periodToSeconds.year,
    10_000_000,
    0,
  ),
  "veCRV voters": manualCliff(deployTime, 1_000_000),
  "veCRV holders": manualCliff(deployTime, 1_000_000),
  "liquidity mining": manualLinear(
    deployTime,
    deployTime + 4 * periodToSeconds.year,
    25_000_000,
    0,
  ),
  "lp rewards": lpRewards(deployTime),
  sources: [
    "https://docs.convexfinance.com/convexfinance/general-information/tokenomics",
  ],
};
export default curve;
