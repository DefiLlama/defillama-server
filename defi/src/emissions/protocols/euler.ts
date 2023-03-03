import distribution from "../adapters/euler";
import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start = 1640995200;
const cliff = 1640995200;

const euler: Protocol = {
  "user incentives": distribution,
  "early users": manualCliff(start, 271_828),
  treasury: manualCliff(start, 3_759_791),
  shareholders: manualLinear(
    cliff,
    cliff + periodToSeconds.month * 18,
    7_026_759,
  ),
  "DAO partners": manualLinear(
    cliff,
    cliff + periodToSeconds.month * 18,
    2_628_170,
  ),
  "Encode incubator": manualLinear(
    cliff,
    cliff + periodToSeconds.month * 30,
    1_087_313,
  ),
  "employees, advisors, consultants": manualLinear(
    cliff,
    cliff + periodToSeconds.month * 48,
    5_613_252,
  ),
  sources: ["https://docs.euler.finance/eul/about"],
  token: "ethereum:0xd9fcd98c322942075a5c3860693e9f4f03aae07b",
  notes: [
    `within the 'employees, advisors, consultants' section, co-founders have a 48 month linear unlock schedule, while all others have undisclosed individual agreements. Here we have shown the whole section to have the same schedule as co-founders.`,
  ],
};
export default euler;
