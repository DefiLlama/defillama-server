import { Protocol } from "../types/adapters";
import manualMasterchef from "../adapters/sushi/manualMasterchef";

const sushi: Protocol = {
  "liquidity mining": manualMasterchef(0.9),
  "development fund": manualMasterchef(0.1),
  sources: ["https://dev.sushi.com/docs/FAQ/Sushinomics%20FAQ"],
};
export default sushi;
