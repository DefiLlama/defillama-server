import { earlyUsers, employees, teamAndInvestors } from "../adapters/curve";
import { community } from "../adapters/curve";
import { manualCliff } from "../adapters/manual";
import { Protocol } from "../types/adapters";

const curve: Protocol = {
  "community reserve": community,
  "early users": earlyUsers,
  employees,
  "team and investors": teamAndInvestors,
  community: manualCliff(1597285800, 151_515_151),
};
export default curve;
// https://etherscan.io/tx/0x3f9aa0ff15fbd00cce60e36f32f25d6f85a43a19d983100d98007a84609f861a
// https://curve.readthedocs.io/dao-gauges.html
// inflation reduced by 2^0.25x each year
// first year
