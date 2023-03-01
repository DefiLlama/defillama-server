import { manualCliff, manualLinear } from "../adapters/manual";
import { LinearAdapterResult, Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start = 1660518000;
const qty = 1_000_000_000;

const inflation = () => {
  const sections: LinearAdapterResult[] = [];
  const months: number = 120;
  let rate: number = 0.05;
  let thisStart = start + periodToSeconds.year;
  let end = thisStart + periodToSeconds.month;

  for (let i = 0; i < months; i++) {
    sections.push(manualLinear(thisStart, end, qty * rate));
    thisStart = end;
    end += periodToSeconds.month;
    rate *= 0.35;
  }
  return sections;
};

const canto: Protocol = {
  "initial contributors": manualCliff(start, qty * 0.13),
  "testnet users": manualCliff(start, qty * 0.02),
  "long term liquidity mining": manualLinear(
    start + periodToSeconds.year,
    start + 10 * periodToSeconds.year,
    qty * 0.45,
  ),
  "medium term liquidity mining": manualLinear(
    start,
    start + periodToSeconds.year,
    qty * 0.35,
  ),
  grants: manualCliff(start, qty * 0.05),
  inflation: inflation(),
  token: "canto:0x826551890dc65655a0aceca109ab11abdbd7a07b",
  sources: ["https://docs.canto.io/technical-reference/token-economics"],
};

export default canto;
