import { euler1 } from "../adapters/uniswap";
import { manualCliff } from "../adapters/manual";
import { Protocol } from "../types/adapters";

const start = 1640995200;
const euler: Protocol = {
  "user incentives": [], //6,795,705 over 4yrs
  "early users": manualCliff(start, 271_828),
  treasury: manualCliff(start, 3_759_791),
  shareholders: [], //7,026,759 18mo 1/1/22 onwards lin
  "DAO partners": [], //2,628,170 18mo 1/1/22 onwards lin
  "Encode incubator": [], //1,087,313 30mo 1/1/22 onwards lin
  "employees, advisors, consultants": [], //5,613,252  COFOUNDERSN ONLY 48mo 1/1/22 onwards lin
  sources: ["https://docs.euler.finance/eul/about"],
  token: "ethereum:0xd9fcd98c322942075a5c3860693e9f4f03aae07b",
};
export default euler;
