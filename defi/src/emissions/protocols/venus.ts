import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start: number = 0;
const qty: number = 30_000_000;

const quickswap: Protocol = {
  "Binance LaunchPool": manualCliff(start, qty * 0.2),
  "Ecosystem grants": manualCliff(start, qty * 0.01),
  Incentives: manualLinear(start, start + periodToSeconds.year, qty * 0.79),
  sources: ["https://venus.io/Whitepaper.pdf"],
  token: "bsc:0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63",
};
export default quickswap;
