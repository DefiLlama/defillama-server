import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";
import { yearnContributors as contributors } from "../adapters/curve";

const yearn: Protocol = {
  community: manualLinear(
    1594969200,
    1594969200 + periodToSeconds.day * 9,
    30_000,
    0,
  ),
  contributors,
  treasury: manualCliff(1612530000, 3_881),
  sources: [
    "https://finematics.com/yearn-finance-and-yfi-explained/",
    "https://gov.yearn.finance/t/yip-57-funding-yearns-future/9319",
  ],
};
export default yearn;
