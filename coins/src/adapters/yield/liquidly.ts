import { getCurrentUnixTimestamp } from "../../utils/date";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

type Config = { address: string; rateProvider: string; symbol: string };

const underlying: string = "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38";
const decimals: number = 18;

const rateProviders: {
  [chain: string]: Config[];
} = {
  sonic: [
    {
      address: "0x944D4AE892dE4BFd38742Cc8295d6D5164c5593C",
      rateProvider: "0x3DF5A1f8e1742f225e485afB99CcFE910D3A077a",
      symbol: "bpt-anS-SiloWS",
    },
  ],
};

export async function liquidly(timestamp: number) {
  return Promise.all(
    Object.keys(rateProviders).map((c: string) =>
      getPrices(timestamp, c, rateProviders[c]),
    ),
  );
}

async function getPrices(timestamp: number, chain: string, configs: Config[]) {
  const writes: Write[] = [];
  const pricesObject: any = {};

  await Promise.all(
    configs.map(async ({ address, rateProvider: target, symbol }) => {
      let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
      const api = await getApi(chain, t, true);

      const price = await api.call({
        abi: "function rate(address token) external view returns (uint256)",
        target,
        params: address,
      });

      pricesObject[address] = {
        underlying,
        symbol,
        decimals,
        price: price / 10 ** decimals,
      };
    }),
  );

  return await getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "liquidly",
    writes,
  });
}
