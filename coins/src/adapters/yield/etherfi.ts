import { getCurrentUnixTimestamp } from "../../utils/date";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const accountants: { [chain: string]: { [address: string]: string } } = {
  ethereum: {
    "0x0d05D94a5F1E76C18fbeB7A13d17C8a314088198": "liquidETH",
    "0xc315D6e14DDCDC7407784e2Caf815d131Bc1D3E7": "liquidUSD",
  },
};

export async function etherfi(timestamp: number) {
  return Promise.all(
    Object.keys(accountants).map((k: string) => getTokenPrices(timestamp, k)),
  );
}

async function getTokenPrices(timestamp: number, chain: string) {
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);
  const calls = Object.keys(accountants[chain]).map((target: string) => ({
    target,
  }));
  const [underlyings, rates, decimals, vaults] = await Promise.all([
    api.multiCall({
      abi: "address:base",
      calls,
    }),
    api.multiCall({
      abi: "uint256:getRate",
      calls,
    }),
    api.multiCall({
      abi: "uint8:decimals",
      calls,
    }),
    api.multiCall({
      abi: "address:vault",
      calls,
    }),
  ]);

  const pricesObject: any = {};

  vaults.map((v, i) => {
    pricesObject[v] = {
      underlying: underlyings[i],
      symbol: Object.values(accountants[chain])[i],
      decimals: decimals[i],
      price: rates[i] / 10 ** decimals[i],
    };
  });

  const writes: Write[] = [];
  return await getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "etherfi",
    writes,
  });
}
