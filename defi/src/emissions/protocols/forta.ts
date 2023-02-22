import { Protocol } from "../types/adapters";
import { manualCliff, manualLinear } from "../adapters/manual";
import { periodToSeconds } from "../utils/time";

const nonCommunity = (percentage: number) => [
  manualLinear(
    start + periodToSeconds.year,
    start + periodToSeconds.year * 4,
    totalQty * percentage * 0.75,
  ),
  manualCliff(start + periodToSeconds.year, totalQty * percentage * 0.25),
];
const totalQty = 1_000_000_000;
const start = 1655517600;
const forta: Protocol = {
  airdrop: manualCliff(start, totalQty * 0.04),
  "node runner rewards": manualCliff(start, totalQty * 0.002),
  other: [
    manualCliff(start, 0.01),
    manualCliff(start + periodToSeconds.year * 2, 0.012),
  ],
  unallocated: manualCliff(start, totalQty * 0.391), // unconfirmed
  backers: nonCommunity(0.245),
  "core contributors": nonCommunity(0.2),
  OpenZeppelin: nonCommunity(0.1),
  sources: ["https://docs.forta.network/en/latest/fort-token/"],
  token: "ethereum:0x41545f8b9472d758bb669ed8eaeeecd7a9c4ec29",
  notes: [
    "the emission rate of unallocated in unconfirmed. Here we have used a pessimistic emission schedule",
  ],
};
export default forta;
