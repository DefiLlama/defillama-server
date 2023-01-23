import { call } from "@defillama/sdk/build/abi/abi2";
import { getBlock } from "@defillama/sdk/build/computeTVL/blocks";
import { AdapterResult } from "../../types/adapters";
import { periodToSeconds } from "../../utils/time";

export default function main(token: string, start: number): AdapterResult[] {
  const results = [];
  const rateReductionPeriod = periodToSeconds.year;
  const rateReductionCoefficient = 2 ** 0.25;
  let cliff = 0;
  let amount = 274_815_283;

  for (let i = 0; i < 6; i++) {
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
