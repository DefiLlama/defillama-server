import { earlyUsers, employees, teamAndInvestors } from "../adapters/convex";
import { manualCliff } from "../adapters/manual";
import { Protocol } from "../types/adapters";

export const curve: Protocol = {
  investors,
  treasury,
  team,
  "veCRV voters": manualCliff(),
  "veCRV holders": [],
  "liquidity mining": [],
  "lp rewards": [],
};

// https://etherscan.io/tx/0x3f9aa0ff15fbd00cce60e36f32f25d6f85a43a19d983100d98007a84609f861a
// https://curve.readthedocs.io/dao-gauges.html
// inflation reduced by 2^0.25x each year
// first year
