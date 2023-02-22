import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";

const start = 1674410400;
const qty = 20_000_000 - 10_000;
const zyberswap: Protocol = {
  "liquidity incentives": manualLinear(start, start + 66633333, qty * 0.865),
  team: manualLinear(start, start + 66633333, qty * 0.09),
  marketing: manualLinear(start, start + 66633333, qty * 0.045),
  "initial liquidity": manualCliff(start, 10_000),
  token: "arbitrum:0x3b475f6f2f41853706afc9fa6a6b8c5df1a2724c",
  sources: ["https://docs.zyberswap.io/tokenomics/zyber-token"],
};

export default zyberswap;
