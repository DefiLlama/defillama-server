import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";
import { balancer, treasury } from "../adapters/aura";

const aura: Protocol = {
  "lp rewards": [],
  treasury,
  "auraBAL rewards": [],
  "Balancer treasury": balancer,
  team: [],
  AURA: [],
  "launch incentives": [],
  sources: [],
};
export default aura;
