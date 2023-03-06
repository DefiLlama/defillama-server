import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start = 1671840000;
const qty = 50_000_000;

const vela: Protocol = {
  Incentives: manualCliff(start, qty * 0.3),
  "Growth fund": manualCliff(start, qty * 0.19),
  Marketing: manualCliff(start, qty * 0.05),
  Team: manualLinear(
    start + periodToSeconds.month * 6,
    start + periodToSeconds.month * 42,
    qty * 0.165,
  ),
  "Bridged DXP": manualCliff(start, qty * 0.18),
  "Investors & partners": manualCliff(start, qty * 0.05),
  Advisors: manualLinear(
    start + periodToSeconds.month * 6,
    start + periodToSeconds.month * 18,
    qty * 0.02,
  ),
  notes: [
    `no emission schedule is given for incentives, growth fund, marketing, so we've taken a pessimistic view and indicated them as unlocking immediately.`,
  ],
  token: "arbitrum:0x088cd8f5ef3652623c22d48b1605dcfe860cd704",
  sources: [
    "https://vela-exchange.gitbook.io/vela-knowledge-base/token-economy/usdvela-distribution",
  ],
};

export default vela;
