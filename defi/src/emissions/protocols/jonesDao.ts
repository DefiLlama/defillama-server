import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start = 1642896000;
const qty = 10_000_000;

const jonesDao: Protocol = {
  //Operations: 15% dynamic rate to handle gov etc
  //Incentives: 42%, dynamic rate over 7-10yrs
  "Core contributors": manualLinear(
    start,
    start + periodToSeconds.month * 18,
    qty * 0.12,
  ),
  "Public sale": manualCliff(start, qty * 0.17),
  "Private sale": [
    manualCliff(start + periodToSeconds.month * 3, (qty * 0.1297) / 3),
    manualLinear(
      start + periodToSeconds.month * 3,
      start + periodToSeconds.month * 9,
      (qty * 0.1297 * 2) / 3,
    ),
  ],
  Airdrop: manualCliff(start, qty * 0.01),
  //   Olympus: manualCliff(start, qty * 0.033),
  sources: ["https://docs.jonesdao.io/jones-dao/jones-token/tokenomics"],
  token: "arbitrum:0x10393c20975cf177a3513071bc110f7962cd67da",
  notes: [
    `Operations and Incentives allocations are emitted at a dynamic rate, so they have been excluded from our analysis. OlympusDAO's allocation is to be held in perpetuity (effectively burnt) so it has been excluded from our analysis.`,
  ],
};
export default jonesDao;
