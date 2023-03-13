import { manualCliff, manualLinear, manualStep } from "../adapters/manual";
import { LinearAdapterResult, Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const qty = 100_000_000;
const start = 1617577200;
const rewardMonths = 36;

const rewards = (): LinearAdapterResult[] => {
  let sections: LinearAdapterResult[] = [];
  let thisStart: number = start;
  let workingQty: number = 0;

  for (let i = 1; i < rewardMonths; i++) {
    const year: number = i / 12;
    const thisQty: number = 32_000_000 * (1 - 0.5 ** year);

    sections.push(
      manualLinear(
        thisStart,
        thisStart + periodToSeconds.month,
        thisQty - workingQty,
      ),
    );

    workingQty = thisQty;
    thisStart += periodToSeconds.month;
  }

  return sections;
};
const liquity: Protocol = {
  "Stability Pool rewards": rewards(),
  "Uniswap LPs": manualCliff(start, 1_333_333),
  //   "Community reserve": manualCliff(start, qty * 0.02),
  Endowment: manualCliff(start + periodToSeconds.year, qty * 0.0606),
  "Team and advisors": [
    manualCliff(start + periodToSeconds.year, qty * 0.2665 * 0.25),
    manualStep(
      start + periodToSeconds.year,
      periodToSeconds.month,
      27,
      (qty * 0.2665 * 0.75) / 27,
    ),
  ],
  "Service providers": manualCliff(start + periodToSeconds.year, qty * 0.0104),
  Investors: manualCliff(start + periodToSeconds.year, qty * 0.339),
  notes: [
    `The Community reserve allocation (2%) is used for grants, hackathons, events etc. There is no given emissions schedule, so it has been excluded from analysis.`,
  ],
  sources: ["https://medium.com/liquity/liquity-launch-details-4537c5ffa9ea"],
  token: "ethereum:0x5f98805a4e8be255a32880fdec7f6728c6568ba0",
  protocolIds: ["270"],
};
export default liquity;
