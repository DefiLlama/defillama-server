import { ecosystem } from "../adapters/aave";
import { manualCliff } from "../adapters/manual";
import { Protocol } from "../types/adapters";

const aave: Protocol = {
  "LEND to AAVE migrator": manualCliff(1601625600, 13_000_000),
  "Ecosysten reserve": ecosystem,
};
export default aave;
// https://docs.aave.com/aavenomics/incentives-policy-and-aave-reserve
// https://etherscan.io/tx/0x751c299f081d1a763cb6eff46616574a822b7d3376168e406e25ba03293e17b2
