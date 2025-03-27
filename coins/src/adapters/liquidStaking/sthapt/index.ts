import fetch from "node-fetch";
import getWrites from "../../utils/getWrites";
import { Write } from "../../utils/dbInterfaces";
import { symbol } from "@defillama/sdk/build/erc20";

const address: string =
  "0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6::staking";

export async function sthApt(timestamp: number = 0): Promise<Write[]> {
  const qtys = await fetch(`https://rpc.ankr.com/http/aptos/v1/view`, {
    method: "POST",
    body: JSON.stringify({
      function: `${address}::thAPT_sthAPT_exchange_rate_synced`,
      type_arguments: [],
      arguments: [],
    }),
  }).then((res) => res.json());

  const pricesObject: any = {
    [`${address}::StakedThalaAPT`]: {
      underlying: `${address}::ThalaAPT`,
      price: qtys[0] / qtys[1],
      symbol: "sthAPT",
      decimals: 8,
    },
  };

  return getWrites({
    chain: "aptos",
    timestamp,
    pricesObject,
    projectName: "sthAPT",
  });
}
