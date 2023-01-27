import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";
import { yearnContributors as contributors } from "../adapters/curve";

// (total alloc point - alloc point pool 45) / total alloc point * sushi per block
// for emissions
const sushi: Protocol = {
  "liquidity mining": [],
  "development fund": [],
  sources: [],
};
export default sushi;
