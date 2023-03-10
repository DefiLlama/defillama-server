import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start: number = 1610126596;
const qty: number = 1_000_000;

const perpetual: Protocol = {
  Community: manualLinear(start, start + periodToSeconds.year * 4, qty * 0.9),
  Airdrop: manualCliff(start + periodToSeconds.year, qty * 0.06),
  "Team and marketing": manualLinear(start, start + 39139200, qty * 0.04),
  sources: ["https://discord.gg/dSMd7AFH36"],
  token: "polygon:0xb5c064f955d8e7f38fe0460c556a72987494ee17",
};
export default perpetual;
