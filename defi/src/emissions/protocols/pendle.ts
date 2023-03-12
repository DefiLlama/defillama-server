import { manualCliff, manualLinear, manualStep } from "../adapters/manual";
import { Protocol, AdapterResult } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start: number = 1619478000;
const qty: number = 251_061_124;
const initialRate: number = 1_200_000;
const decay: number = 0.01;
const totalWeeks = 300;

const incentives = () => {
  const chartSections: AdapterResult[] = [];
  let thisStart = start;
  let amount = initialRate;
  for (let i = 0; i < totalWeeks; i++) {
    chartSections.push(
      manualLinear(thisStart, thisStart + periodToSeconds.week, amount),
    );
    thisStart += periodToSeconds.week;
    if (i < 26) continue;
    amount *= 1 - decay;
    if (i > 260) amount = 589000;
  }
  return chartSections;
};

const pendle: Protocol = {
  Team: [
    manualCliff(start + periodToSeconds.year, qty * 0.11),
    manualStep(
      start + periodToSeconds.year,
      periodToSeconds.month * 3,
      4,
      (qty * 0.11) / 4,
    ),
  ],
  "Ecosystem fund": [
    manualCliff(start, qty * 0.09),
    manualCliff(start + periodToSeconds.year, qty * 0.09),
  ],
  Incentives: incentives(),
  Investors: manualStep(start, periodToSeconds.month * 3, 4, (qty * 0.15) / 4),
  Advisors: manualStep(start, periodToSeconds.month * 3, 4, (qty * 0.01) / 4),
  "Liquidity bootstrapping": manualCliff(start, qty * 0.07),
  sources: ["https://medium.com/pendle/pendle-tokenomics-3a33d9caa0e4"],
  token: "ethereum:0x808507121b80c02388fad14726482e061b8da827",
  protocolIds: ["382"],
};
export default pendle;
