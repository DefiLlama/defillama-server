import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { periodToSeconds } from "../utils/time";

const start = 1621206000;
const qty = 210_000_000_000;

const abracadabra: Protocol = {
  //   Incentives: manualLinear(start, start + , qty * 0.63),
  IDO: manualCliff(start, qty * 0.07),
  Team: manualLinear(start, start + periodToSeconds.day * 1075, qty * 0.3),
  notes: [
    `Abracadabra were unable to give details about the team's unlock schedule. Therefore we've extrapolated their vesting rate (as of 14 Mar '23) to estimate an average Team unlock schedule.`,
    `The rate of emission of Incentives (63% of supply) is decided by governance and inconsistent, therefore this has been excluded from our analysis.`,
  ],
  token: "ethereum:0x090185f2135308bad17527004364ebcc2d37e5f6",
  sources: ["https://abracadabramoney.gitbook.io/learn/tokens/tokenomics"],
  protocolIds: ["347"],
};

export default abracadabra;
