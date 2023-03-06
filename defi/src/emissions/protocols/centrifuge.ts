import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start = 0;
const qty = 425_000_000;

const centrifuge: Protocol = {
  "Community sale": manualCliff(start, qty * 0.103),
  "Core team": [
    manualCliff(start + periodToSeconds.year, qty * 0.292 * 0.2),
    manualLinear(
      start + periodToSeconds.year,
      start + periodToSeconds.year * 5,
      qty * 0.292 * 0.8,
    ),
  ],
  "Foundation endowment": manualCliff(start, qty * 0.127),
  "Community grants": manualCliff(start, qty * 0.204),
  "Early ecosystem": manualCliff(start, qty * 0.09),
  "Early backers": manualCliff(start, qty * 0.185),
  sources: ["https://docs.centrifuge.io/learn/token-summary/"],
  token: "ethereum:0xd33526068d116ce69f19a9ee46f0bd304f21a51f",
  notes: [
    "There isnt much information available regarding vesting schedules, so we have used the pessimistic view that tokens were immediately unlocked.",
  ],
};
export default centrifuge;
