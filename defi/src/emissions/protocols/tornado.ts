import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { governance, teamAndInvestors } from "./../adapters/tornado";

export const tornado: Protocol = {
  governance,
  airdrop: manualCliff(1608260400, 500_000),
  "anonymity mining": manualLinear(
    1608262063,
    1608262063 + 31536000,
    1_000_000,
  ),
  "team and investors": teamAndInvestors,
  sources: [
    "https://etherscan.io/token/0x77777feddddffc19ff86db637967013e6c6a116c#balances",
  ],
  token: "ethereum:0x77777feddddffc19ff86db637967013e6c6a116c",
  protocolIds: ["148"],
};
export default tornado;
