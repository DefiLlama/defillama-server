import { manualCliff, manualStep } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start: number = 1599260400;
const v1Launch: number = 1607990400;
const mainnetLaunch: number = 1623711600;
const qty: number = 150_000_000;

const perpetual: Protocol = {
  "Ecosystem and rewards": [],
  "Seed investors": manualStep(
    v1Launch,
    periodToSeconds.year / 4,
    4,
    (qty * 0.042) / 4,
  ),
  "Balancer LBP": manualCliff(start, qty * 0.05),
  "Strategic investors": manualStep(
    v1Launch,
    periodToSeconds.year / 4,
    4,
    (qty * 0.15) / 4,
  ),
  "Team and advisors": manualStep(
    mainnetLaunch + periodToSeconds.month * 6,
    periodToSeconds.year / 4,
    48,
    656250,
  ),
  notes: [
    `Seed and strategic investors received either 1/4 or 1/5 of their tokens each quarter. Here we have assumed 1/4 for all.`,
    `The DAO was allocated 54.8%, with no set emissions schedule, therefore this has been excluded from the analysis.`,
  ],
  sources: [
    "https://support.perp.com/hc/en-us/articles/5748445892761-PERP-Token#heading-1",
  ],
  token: "ethereum:0xbc396689893d065f41bc2c6ecbee5e0085233447",
};
export default perpetual;
