import { Protocol } from "../types/adapters";
import { manualCliff, manualStep } from "../adapters/manual";
import { periodToSeconds } from "../utils/time";

const totalQty = 1_000_000_000;
const start = 1665529200;
const aptos: Protocol = {
  community: [
    manualCliff(start, totalQty * 0.125),
    manualStep(
      start,
      periodToSeconds.month,
      120,
      (510_217_359.767 - totalQty * 0.125) / 120,
    ),
  ],
  "core contributors": [
    manualStep(
      start + periodToSeconds.month * 13,
      periodToSeconds.month,
      6,
      (totalQty * 0.19 * 3) / 48,
    ),
    manualStep(
      start + periodToSeconds.month * 19,
      periodToSeconds.month,
      30,
      (totalQty * 0.19) / 48,
    ),
  ],
  foundation: [
    manualCliff(start, totalQty * 0.005),
    manualStep(start, periodToSeconds.month, 120, (totalQty * 0.16) / 120),
  ],
  investors: [
    manualStep(
      start + periodToSeconds.month * 13,
      periodToSeconds.month,
      6,
      (134_782_640.233 * 3) / 48,
    ),
    manualStep(
      start + periodToSeconds.month * 19,
      periodToSeconds.month,
      30,
      134_782_640.233 / 48,
    ),
  ],
  sources: ["https://aptosfoundation.org/currents/aptos-tokenomics-overview"],
  token: "coingecko:aptos",
};
export default aptos;
