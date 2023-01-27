import { manualCliff, manualStep } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const quantities = {
  investors: 277_295_070,
  employees: 152_704_930,
  futureEmployees: 70_000_000,
};
const tornado: Protocol = {
  "future employees & consultannts": [
    manualCliff(1675436400, quantities.futureEmployees * 0.3),
    manualStep(
      1677855600,
      periodToSeconds.month,
      6,
      quantities.futureEmployees * 0.4,
    ),
    manualStep(
      1693749600,
      periodToSeconds.month,
      6,
      quantities.futureEmployees * 0.2,
    ),
    manualStep(
      1709478000,
      periodToSeconds.month,
      6,
      quantities.futureEmployees * 0.1,
    ),
  ],
  "employees and consultants": [
    manualCliff(1675436400, quantities.employees * 0.3),
    manualStep(
      1677855600,
      periodToSeconds.month,
      6,
      quantities.employees * 0.4,
    ),
    manualStep(
      1693749600,
      periodToSeconds.month,
      6,
      quantities.employees * 0.2,
    ),
    manualStep(
      1709478000,
      periodToSeconds.month,
      6,
      quantities.employees * 0.1,
    ),
  ],
  investors: [
    manualCliff(1675436400, quantities.investors * 0.3),
    manualStep(
      1677855600,
      periodToSeconds.month,
      6,
      quantities.investors * 0.4,
    ),
    manualStep(
      1693749600,
      periodToSeconds.month,
      6,
      quantities.investors * 0.2,
    ),
    manualStep(
      1709478000,
      periodToSeconds.month,
      6,
      quantities.investors * 0.1,
    ),
  ],
  "safety module": manualStep(
    1627999200,
    4 * periodToSeconds.week,
    66,
    25_000_000,
  ),
  "liquidity module": manualStep(
    1627999200,
    4 * periodToSeconds.week,
    66,
    25_000_000,
  ),
  "liquidity provider rewards": manualStep(
    1627999200,
    4 * periodToSeconds.week,
    66,
    75_000_000,
  ),
  "trading rewards": manualStep(
    1627999200,
    4 * periodToSeconds.week,
    66,
    250_000_000,
  ),
  "DAO treasury": manualCliff(1627999200, 50_000_000),
  "retroactive mining rewards": manualCliff(1627999200, 75_000_000),
  sources: [
    "https://docs.dydx.community/dydx-governance/start-here/dydx-allocations",
  ],
};
export default tornado;
