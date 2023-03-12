import { ecosystem } from "../adapters/aave";
import { manualCliff } from "../adapters/manual";
import { Protocol } from "../types/adapters";

const aave: Protocol = {
  "LEND to AAVE migrator": manualCliff(1601625600, 13_000_000),
  "Ecosysten reserve": ecosystem,
  sources: [
    "https://docs.aave.com/aavenomics/incentives-policy-and-aave-reserve",
    "https://etherscan.io/tx/0x751c299f081d1a763cb6eff46616574a822b7d3376168e406e25ba03293e17b2",
  ],
  token: "ethereum:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
  protocolIds: ["111", "1599", "1838", "1839"],
};
export default aave;
