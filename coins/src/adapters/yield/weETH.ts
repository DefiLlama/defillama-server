import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

export async function weETH(timestamp: number) {
  const chain = "ethereum";
  const writes: Write[] = [];

  const api = await getApi(chain, timestamp, true);
  const rate = await api.call({
    abi: "function getEETHByWeETH(uint256) view returns (uint256)",
    target: "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee",
    params: [1e10],
  });
  const price = rate / 10 ** 10;
  const pricesObject: any = {
    "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee": {
      underlying: "0x35fA164735182de50811E8e2E824cFb9B6118ac2",
      price,
    },
  };

  return getWrites({
    chain,
    timestamp,
    writes,
    pricesObject,
    projectName: "weETH",
  });
}
