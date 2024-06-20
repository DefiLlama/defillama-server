import { getApi } from "../../utils/sdk";
import getWrites from "../../utils/getWrites";

export async function ifil(timestamp: number) {
  const chain = "filecoin";
  const api = await getApi(chain, timestamp);

  const rate = await api.call({
    abi: "function convertToShares(uint256 assets) external view returns (uint256)",
    target: "0x43dAe5624445e7679D16a63211c5ff368681500c",
    params: 1e12,
  });

  const pricesObject: any = {
    "0x690908f7fa93afC040CFbD9fE1dDd2C2668Aa0e0": {
      underlying: "0x0000000000000000000000000000000000000000",
      price: rate / 1e12,
    },
  };

  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "iFIL",
  });
}
