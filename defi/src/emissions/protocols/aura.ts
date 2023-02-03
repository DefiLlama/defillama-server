import { manualCliff } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { auraBalRewards, balancer, treasury } from "../adapters/aura";
import { auraMasterchef } from "../adapters/sushi";

const aura: Protocol = {
  "lp rewards": auraMasterchef,
  treasury,
  "auraBAL rewards": auraBalRewards,
  "Balancer treasury": balancer,
  team: [], //
  AURA: [],
  "launch incentives": [],
  "future incentives": manualCliff(1670500408, 1_000_000), // 0x1a661CF8D8cd69dD2A423F3626A461A24280a8fB
  sources: ["https://docs.aura.finance/aura/usdaura/distribution"],
};
export default aura;
// hard to identify:
// 0x45025ebc38647bcf7edd2b40cfdaf3fbfe1538f5
// 0x2AE1Ee55dfaDAC71EF5F25f093D2f24Fe58961f1
// 0x5bd3fCA8D3d8c94a6419d85E0a76ec8Da52d836a
