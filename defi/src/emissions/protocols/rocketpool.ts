import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start = 1506121200;
const inflationStart = 1632956400;
const end = inflationStart + periodToSeconds.year * 3;
const inflationRate = 0.05;
const totalQty = 18_000_000;

const qty = (proportion: number) => {
  const period = end - inflationStart;
  const percentageIncrease =
    (1 + inflationRate) ** (period / periodToSeconds.year) - 1;
  return percentageIncrease * proportion * totalQty;
};

const rocketpool: Protocol = {
  "Node operators": manualLinear(inflationStart, end, qty(0.7)),
  "Oracle DAO members": manualLinear(inflationStart, end, qty(0.15)),
  "Protocol DAO Treasury": manualLinear(inflationStart, end, qty(0.15)),
  ICO: manualCliff(start, totalQty * 0.85),
  Team: manualCliff(start, totalQty * 0.15),
  sources: [
    "https://medium.com/rocket-pool/rocket-pool-staking-protocol-part-3-3029afb57d4c",
    "https://medium.com/rocket-pool/rocket-pool-token-presale-9d0832477894",
    "https://medium.com/ddcfund/rocket-pool-rpl-the-leading-decentralized-staking-pool-for-ethereum-8101cbea9c5d",
  ],
  token: "ethereum:0xd33526068d116ce69f19a9ee46f0bd304f21a51f",
};
export default rocketpool;
