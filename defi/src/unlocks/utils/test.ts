import adapter from "../adapters/dydx";
import { Allocation, SubAllocation } from "../types/adapters";
import { periodToSeconds } from "./time";
export function getCirculatingSupplyAtTimestamp(
  vestingSchedule: Allocation,
  timestamp: number = Date.now() / 1000,
): number {
  let circSupply = 0;
  const allSections = [
    ...vestingSchedule.insiders,
    ...vestingSchedule.community,
  ];
  allSections.map((s: SubAllocation) => {
    if (typeof s.schedule == "number") return (circSupply += s.schedule);
    const a = s.schedule(timestamp);
    circSupply += a;
  });
  return circSupply;
}
function main() {
  const time = 1627999200 + 28 * periodToSeconds.day;
  let a = getCirculatingSupplyAtTimestamp(adapter.vestingSchedule, time);
  return;
}
main(); // ts-node utils/test.ts
