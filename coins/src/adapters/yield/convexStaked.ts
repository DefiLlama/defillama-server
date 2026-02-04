import { getCurrentUnixTimestamp } from "../../utils/date";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const assets: {
  [chain: string]: {
    [address: string]: {
      tokens: string[];
      abi: string;
      handler: (res: any[]) => Promise<any[]>;
    };
  };
} = {
  ethereum: {
    curveToken: {
      tokens: [
        "0x72eD19788Bce2971A5ed6401662230ee57e254B7",
        "0x444FA0ffb033265591895b66c81c2e5fF606E097",
      ],
      abi: "address:curveToken",
      handler: async (res) => res.map((r) => r.toLowerCase()),
    },
    getPhantomTokenInfo: {
      tokens: ["0xcB5D10A57Aeb622b92784D53F730eE2210ab370E"],
      abi: " function getPhantomTokenInfo() external view returns (address, address)",
      handler: async (res) => res.map((r) => r[1].toLowerCase()),
    },
  },
};

export async function convexStaked(timestamp: number) {
  return Promise.all(
    Object.keys(assets).map((chain: string) =>
      getTokenPrices(timestamp, chain),
    ),
  );
}

async function getTokenPrices(timestamp: number, chain: string) {
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);

  const writes: Write[] = [];
  await Promise.all(
    Object.keys(assets[chain]).map(async (type: string) => {
      const { tokens, abi, handler } = assets[chain][type];
      const calls = tokens.map((target: string) => ({ target }));
      const [underlyings, decimals, symbols] = await Promise.all([
        api
          .multiCall({
            abi,
            calls,
          })
          .then((res) => handler(res)),
        api.multiCall({
          abi: "erc20:decimals",
          calls,
        }),
        api.multiCall({
          abi: "erc20:symbol",
          calls,
        }),
      ]);

      const redirectData = await getTokenAndRedirectDataMap(
        underlyings,
        chain,
        timestamp,
      );

      underlyings.map((u: string, i: number) =>
        addToDBWritesList(
          writes,
          chain,
          tokens[i],
          undefined,
          decimals[i],
          symbols[i],
          timestamp,
          "convex-staked",
          0.9,
          redirectData[u]?.redirect ?? `asset#${chain}:${u}`,
        ),
      );
    }),
  );

  return writes;
}
