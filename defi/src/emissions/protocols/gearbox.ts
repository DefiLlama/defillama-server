import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start = 1639526400;
const qty = 10_000_000_000;

const centrifuge: Protocol = {
  "Community DAO": manualCliff(start, qty * 0.5),
  "Early Discord Legends": manualCliff(start, qty * 0.00348),
  "Early app testers": manualCliff(start, qty * 0.01085),
  "Temporary reserve": [],
  "Credit account mining": manualCliff(start, qty * 0.05),
  "External contributors": manualLinear(
    start + periodToSeconds.year,
    start + periodToSeconds.year * 2.5,
    qty * 0.0128,
  ),
  "Early contributors": manualLinear(
    start + periodToSeconds.year,
    start + periodToSeconds.year * 2,
    qty * 0.092,
  ),
  "Initial core members": manualLinear(
    start + periodToSeconds.year,
    start + periodToSeconds.year * 2.5,
    qty * 0.2,
  ),
  "Company wallet": manualLinear(
    start + periodToSeconds.year,
    start + periodToSeconds.year * 2.5,
    qty * 0.1152,
  ),
  sources: ["https://docs.gearbox.finance/gear-token/gear-overview"],
  token: "ethereum:0xba3335588d9403515223f109edc4eb7269a9ab5d",
  protocolIds: ["1108"],
};
export default centrifuge;
