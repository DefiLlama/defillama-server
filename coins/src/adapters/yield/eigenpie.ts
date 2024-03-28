import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const tokens = [
  "0x49446A0874197839D15395B908328a74ccc96Bc0",
  "0xE46a5E19B19711332e33F33c2DB3eA143e86Bc10",
  "0x32bd822d615A3658A68b6fDD30c2fcb2C996D678",
];

export async function eigenpie(timestamp: number) {
  const chain = "ethereum";
  const writes: Write[] = [];

  const api = await getApi(chain, timestamp, true);
  const [rates, underlyings] = await Promise.all([
    api.multiCall({
      abi: "uint256:exchangeRateToLST",
      calls: tokens.map((target: string) => ({ target })),
    }),
    api.multiCall({
      abi: "address:underlyingAsset",
      calls: tokens.map((target: string) => ({ target })),
    }),
  ]);

  const pricesObject: any = {};
  tokens.map((t: string, i: number) => {
    pricesObject[t] = { underlying: underlyings[i], price: rates[i] / 1e18 };
  });

  return getWrites({
    chain,
    timestamp,
    writes,
    pricesObject,
    projectName: "eigenpie",
  });
}
