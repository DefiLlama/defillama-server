import { manualLinear } from "../adapters/manual";
import { Protocol, AdapterResult } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start: number = 1634943600;
const end: number = start + periodToSeconds.year * 3;
const reductionTimestamp: number = 1666220400;
const qty: number = 1_000_000_000;
const initialRate: number = 1;
const secondOrderRate: number = 1.5 ** (1 / 52);

function incentives(): AdapterResult[] {
  const weeksCount: number = Math.ceil((end - start) / periodToSeconds.week);
  const chartSections: AdapterResult[] = [];

  let thisStart: number = start;
  let amount: number = initialRate;

  for (let i: number = 0; i < weeksCount; i++) {
    if (
      thisStart < reductionTimestamp &&
      reductionTimestamp < thisStart + periodToSeconds.week
    )
      amount *= 0.8;

    chartSections.push(
      manualLinear(thisStart, thisStart + periodToSeconds.week, amount),
    );

    thisStart += periodToSeconds.week;
    amount *= secondOrderRate;
  }

  return chartSections;
}

const angle: Protocol = {
  "Liquidity incentives": incentives,
  //   "Strategic partners": 12%
  Team: manualLinear(start, end, qty * 0.18),
  //   "DAO treasury": 20%
  "Early backers": manualLinear(start, end, qty * 0.1),
  notes: [
    `allocations to strategic partners and the DAO treasury (12% and 20% respectively) have no set emissions schedule and therefore have been excluded from this analysis.`,
  ],
  sources: [
    "https://docs.angle.money/protocol-governance/angle-token",
    "https://snapshot.org/#/anglegovernance.eth/proposal/0x478e838b67f2dffcff6160d4c8adc9622d67db985c981e4cad45c031e284fd63",
  ],
  token: "ethereum:0x31429d1856ad1377a8a0079410b297e1a9e214c2",
  protocolIds: ["756"],
};
export default angle;
