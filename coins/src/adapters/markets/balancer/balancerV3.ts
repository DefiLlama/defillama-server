import * as sdk from "@defillama/sdk";
import { request } from "graphql-request";
import { Write } from "../../utils/dbInterfaces";
import abi from "./abi.json";
import { getApi } from "../../utils/sdk";
import { getPoolValues } from "../../utils";
import getWrites from "../../utils/getWrites";

const vault: string = "0xbA1333333333a1BA1108E8412f11850A5C319bA9";

const graphs: { [chain: string]: string } = {
  arbitrum: sdk.graph.modifyEndpoint(
    "Ad1cgTzScNmiDPSCeGYxgMU3YdRPrQXGkCZgpmPauauk",
  ),
  base: sdk.graph.modifyEndpoint(
    "9b7UBHq8DXxrfGsYhAzF3jZn5mNRgZb5Ag18UL9GJ3cV",
  ),
  ethereum: sdk.graph.modifyEndpoint(
    "4rixbLvpuBCwXTJSwyAzQgsLR8KprnyMfyCuXT8Fj5cd",
  ),
  xdai: sdk.graph.modifyEndpoint(
    "DDoABVc9xCRQwuXRq2QLZ6YLkjoFet74vnfncQDgJVo2",
  ),
};

async function getPoolIds3(chain: string): Promise<string[]> {
  if (!graphs[chain]) throw new Error(`no subgraph for ${chain} balancer V3`);

  let addresses: string[] = [];
  let hasMore = true;
  let skip = 0;
  let size = 1000;

  do {
    const lpQuery = `
    query { pools (
        first: 1000
        skip: ${skip}
        orderBy: address
        orderDirection: desc 
    ) {
        address
    }}`;

    const { pools }: any = await request(graphs[chain], lpQuery);
    addresses.push(...pools.map((p: any) => p.address));
    hasMore = pools.length === size;
  } while (hasMore);

  return addresses;
}

async function getTokenPrices(
  chain: string,
  timestamp: number,
): Promise<Write[]> {
  let writes: Write[] = [];
  const api = await getApi(chain, timestamp);
  const pools: string[] = await getPoolIds3(chain);

  const poolTokens: { tokens: string[]; balancesRaw: number[] }[] =
    await api.multiCall({
      abi: abi.getPoolTokenInfo2,
      target: vault,
      calls: pools,
      permitFailure: true,
    });

  const poolData = {} as any;
  pools.map((p: string, i: number) => {
    const balances = new sdk.Balances({
      chain: api.chain,
      timestamp: api.timestamp,
    });
    poolTokens[i].tokens.forEach((token, idx) => {
      if (token.toLowerCase() === pools[i].toLowerCase()) return;
      balances.add(token, poolTokens[i].balancesRaw[idx]);
    });
    poolData[p] = balances;
  });

  const poolValues = await getPoolValues({ api, pools: poolData });

  const [decimals, supplies] = await Promise.all([
    api.multiCall({
      abi: "erc20:decimals",
      calls: pools,
      permitFailure: true,
    }),
    api.multiCall({
      abi: "erc20:totalSupply",
      calls: pools,
      permitFailure: true,
    }),
  ]);

  const pricesObject: any = {};
  pools.forEach((pool: string, i: number) => {
    if (!poolValues[pool]) return;
    let supply = supplies[i];
    if (!supply) return;
    supply /= 10 ** decimals[i];
    const price = poolValues[pool] / supply;
    if (poolValues[pool] > 1e10 || poolValues[pool] < 1e4) {
      if (poolValues[pool] > 1e10)
        console.log("bad balancer pool result? ignoring it", {
          pool,
          price,
          supply,
          value: poolValues[pool],
        });
      return;
    }
    if (price > 0 && price != Infinity)
      pricesObject[pool] = {
        price,
        supply: supplies[i] / 1e24,
        pool: pools[i],
        poolValue: poolValues[pool] / 1e6,
      };
  });

  return getWrites({
    pricesObject,
    chain: api.chain,
    timestamp,
    writes,
    projectName: "balancer3",
  });
}

export async function balancerV3(timestamp: number = 0) {
  return Promise.all(
    Object.keys(graphs).map((chain) => getTokenPrices(chain, timestamp)),
  );
}
