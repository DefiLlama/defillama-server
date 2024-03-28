import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

export async function osETH(timestamp: number) {
  const chain = "ethereum";
  const writes: Write[] = [];

  const api = await getApi(chain, timestamp, true);
  const rate = await api.call({
    abi: "uint256:getRate",
    target: "0x8023518b2192FB5384DAdc596765B3dD1cdFe471",
  });
  const price = rate / 10 ** 18;
  const pricesObject: any = {
    "0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38": {
      underlying: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      price,
    },
  };

  return getWrites({
    chain,
    timestamp,
    writes,
    pricesObject,
    projectName: "osETH",
  });
}
