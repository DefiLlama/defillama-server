import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start = 1658685600;
const qty = 1_000_000_000;

function schedule(months: number, portion: number) {
  const monthsArray: number[] = Array.from(Array(months).keys());
  return monthsArray.map((month: number) =>
    manualLinear(
      start + month * periodToSeconds.month,
      start + (month + 1) * periodToSeconds.month,
      (portion * 100_000_000) / (1.0539 * month),
    ),
  );
}

const radiant: Protocol = {
  treasury: manualCliff(start, qty * 0.03),
  team: [
    manualLinear(
      start + periodToSeconds.month * 3,
      start + periodToSeconds.month * 15,
      qty * 0.2 * 0.9,
    ),
    manualCliff(start + periodToSeconds.month * 3, qty * 0.2 * 0.1),
  ],
  "core contributors and advisors": manualLinear(
    start,
    start + periodToSeconds.year,
    qty * 0.07,
  ),
  "pool2 incentives": schedule(60, 0.2),
  "supply and borrowers incentives": schedule(60, 0.5),
  token: "arbitrum:0x0c4681e6c0235179ec3d4f4fc4df3d14fdd96017",
  sources: ["https://docs.radiant.capital/radiant/project-info/rdnt-token"],
};

export default radiant;
