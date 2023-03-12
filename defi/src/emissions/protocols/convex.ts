import { lpRewards } from "../adapters/convex";
import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const deployTime = 1621242000;
const convex: Protocol = {
  investors: manualLinear(
    deployTime,
    deployTime + periodToSeconds.year,
    3_300_000,
  ),
  treasury: manualLinear(
    deployTime,
    deployTime + periodToSeconds.year,
    9_700_000,
  ),
  team: manualLinear(deployTime, deployTime + periodToSeconds.year, 10_000_000),
  "veCRV voters": manualCliff(deployTime, 1_000_000),
  "veCRV holders": manualCliff(deployTime, 1_000_000),
  "liquidity mining": manualLinear(
    deployTime,
    deployTime + 4 * periodToSeconds.year,
    25_000_000,
  ),
  // "lp rewards": lpRewards(deployTime),
  sources: [
    "https://docs.convexfinance.com/convexfinance/general-information/tokenomics",
  ],
  token: "ethereum:0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b",
  notes: [
    "calculating the rate of future LP rewards is not possible, since it relies on the number of CRV accumulated. Therefore this section has been excluded from analytics.",
  ],
  protocolIds: ["319"],
};
export default convex;
