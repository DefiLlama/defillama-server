import fetch from "node-fetch";
import getWrites from "./../utils/getWrites";
import { Write } from "./../utils/dbInterfaces";

const staking: string =
  "0x6f8ca77dd0a4c65362f475adb1c26ae921b1d75aa6b70e53d0e340efd7d8bc80";

const truapt: string =
  "0xaef6a8c3182e076db72d64324617114cacf9a52f28325edc10b483f7f05da0e7";

export async function truAPT(timestamp: number = 0): Promise<Write[]> {
  const qtys = await fetch(`https://api.mainnet.aptoslabs.com/v1/view`, {
    method: "POST",
    body: JSON.stringify({
      function: `${staking}::staker::share_price`,
      type_arguments: [],
      arguments: [],
    }),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json());

  const pricesObject: any = {
    [truapt]: {
      underlying: "aptos",
      price: qtys[0] / (1e8 * qtys[1]),
      symbol: "TruAPT",
      decimals: 8,
    },
  };

  return getWrites({
    chain: "aptos",
    timestamp,
    pricesObject,
    projectName: "truAPT",
    underlyingChain: "coingecko",
  });
}
