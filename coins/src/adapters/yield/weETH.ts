import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

export async function weETH(timestamp: number) {
  const chain = "ethereum";
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

  const writes: Write[] = await getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "weETH",
  });

  const length = writes.length;
  for (let i = 0; i < length; i++) {
    const arbWrite: any = {
      PK: `asset#arbitrum:0x35751007a407ca6feffe80b3cb397736d2cf4dbe`,
    };
    Object.keys(writes[i]).map((k: any) => {
      if (k == "PK") return;
      const write: any = writes[i];
      arbWrite[k] = write[k];
    });
    writes.push(arbWrite);
  }

  return writes;
}
