import { getCurrentUnixTimestamp } from "../../utils/date";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { nullAddress } from '../../utils/shared/constants'

const factories: {
  [chain: string]: {
    target: string;
    fromBlock: number;
  };
} = {
  bsc: {
    target: "0x25a55f9f2279A54951133D503490342b50E5cd15",
    fromBlock: 25535640,
  },
};

async function getPrices(timestamp: number, chain: string): Promise<Write[]> {
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);

  const { target, fromBlock } = factories[chain];
  const deploys = await api.getLogs({
    target,
    fromBlock,
    toBlock: Number(api.block),
    topics: [
      "0x48dc7a1b156fe3e70ed5ed0afcb307661905edf536f15bb5786e327ea1933532",
    ],
    eventAbi:
      "event NewStableSwapPair(address indexed swapContract, address tokenA, address tokenB, address tokenC, address LP)",
  });

  const [balancesA, balancesB, balancesC, supplies, decimals] =
    await Promise.all([
      api.multiCall({
        abi: "erc20:balanceOf",
        calls: deploys.map((log) => ({
          target: log.args[1],
          params: log.args[0],
        })),
      }),
      api.multiCall({
        abi: "erc20:balanceOf",
        calls: deploys.map((log) => ({
          target: log.args[2],
          params: log.args[0],
        })),
      }),
      api.multiCall({
        abi: "erc20:balanceOf",
        calls: deploys.map((log) => ({
          target: log.args[3],
          params: log.args[0],
        })),
        permitFailure: true,
      }),
      api.multiCall({
        abi: "erc20:totalSupply",
        calls: deploys.map((log) => ({ target: log.args[4] })),
      }),
      api.multiCall({
        abi: "erc20:decimals",
        calls: deploys.map((log) => ({ target: log.args[4] })),
      }),
    ]);

  const pricingData = await getTokenAndRedirectDataMap(
    deploys
      .map((log) => log.args.slice(1, 4))
      .flat()
      .map((t: string) => t.toLowerCase()),
    chain,
    timestamp,
  );

  function getAum(address: string, balance: number): any {
    const token = pricingData[address.toLowerCase()];
    if (!token) return;
    return (balance * token.price) / 10 ** token.decimals;
  }

  const writes: Write[] = [];
  deploys.map((deploy, i: number) => {
    const aum =
      getAum(deploy.args[1], balancesA[i]) +
      getAum(deploy.args[2], balancesB[i]) +
      (!balancesC[i] && deploy.args[3] == nullAddress
        ? 0
        : getAum(deploy.args[3], balancesC[i]));

    if (isNaN(aum)) return;
    const price = aum / (supplies[i] / 10 ** decimals[i]);

    if (!isFinite(price)) return;

    addToDBWritesList(
      writes,
      chain,
      deploy.args[4],
      price,
      decimals[i],
      "Stable-LP",
      timestamp,
      "pancake-stable",
      0.9,
    );
  });

  return writes;
}

export async function pancakeStable(timestamp: number): Promise<Write[][]> {
  return Promise.all(
    Object.keys(factories).map((chain: string) => getPrices(timestamp, chain)),
  );
}
