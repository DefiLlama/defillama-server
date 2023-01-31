import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";
import { balancer, treasury } from "../adapters/aura";

const aura: Protocol = {
  "lp rewards": [], // 0x1ab80F7Fb46B25b7e0B2cfAC23Fc88AC37aaf4e9
  treasury,
  "auraBAL rewards": [], // 0xC47162863a12227E5c3B0860715F9cF721651C0c
  "Balancer treasury": balancer,
  team: [], //
  AURA: [],
  "launch incentives": [],
  "future incentives": [], // 0x1a661CF8D8cd69dD2A423F3626A461A24280a8fB
  sources: ["https://docs.aura.finance/aura/usdaura/distribution"],
};
export default aura;
