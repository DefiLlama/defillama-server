import { Protocol } from "../types/adapters";
import { sushiMasterchef, sushiDevFund } from "../adapters/sushi";

const sushi: Protocol = {
  "liquidity mining": sushiMasterchef,
  "development fund": sushiDevFund,
  sources: ["https://dev.sushi.com/docs/FAQ/Sushinomics%20FAQ"],
};
export default sushi;
