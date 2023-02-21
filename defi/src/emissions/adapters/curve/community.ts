import { AdapterResult } from "../../types/adapters";
import { periodToSeconds } from "../../utils/time";

export default function main(
  token: string,
  start: number,
  startAmount: number,
  rateReductionCoefficient: number,
  rateReductionPeriod: number,
  cliff: number = 0,
): AdapterResult[] {
  let amount = startAmount;
  const results = [];

  const periodsInNearFuture = (6 * periodToSeconds.year) / rateReductionPeriod;
  for (let i = 0; i < periodsInNearFuture; i++) {
    const end = start + rateReductionPeriod;
    results.push({
      type: "linear",
      start,
      end,
      amount,
      token,
      cliff,
    });

    cliff += amount;
    amount /= rateReductionCoefficient;
    start = end;
  }
  return results;
}
