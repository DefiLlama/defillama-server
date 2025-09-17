import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const contracts: { [chain: string]: { reader: string; store: string } } = {
  arbitrum: {
    reader: "0x6a9505D0B44cFA863d9281EA5B0b34cB36243b45",
    store: "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
  },
};

const abi = {
  inputs: [
    {
      internalType: "contract DataStore",
      name: "dataStore",
      type: "address",
    },
    {
      internalType: "uint256",
      name: "start",
      type: "uint256",
    },
    {
      internalType: "uint256",
      name: "end",
      type: "uint256",
    },
  ],
  name: "getGlvInfoList",
  outputs: [
    {
      components: [
        {
          components: [
            {
              internalType: "address",
              name: "glvToken",
              type: "address",
            },
            {
              internalType: "address",
              name: "longToken",
              type: "address",
            },
            {
              internalType: "address",
              name: "shortToken",
              type: "address",
            },
          ],
          internalType: "struct Glv.Props",
          name: "glv",
          type: "tuple",
        },
        {
          internalType: "address[]",
          name: "markets",
          type: "address[]",
        },
      ],
      internalType: "struct GlvReader.GlvInfo[]",
      name: "",
      type: "tuple[]",
    },
  ],
  stateMutability: "view",
  type: "function",
};

async function getTokenPrices(chain: any, timestamp: number) {
  const { reader, store } = contracts[chain];
  const api = await getApi(chain, timestamp);

  const glvsInfo = await api.call({
    abi,
    target: reader,
    params: [store, 0, 1000],
  });

  const calls: { target: string; params: string }[] = [];
  const allMarkets: string[] = [];
  const allGlvs: string[] = [];
  glvsInfo.map(({ markets, glv }: any) => {
    allGlvs.push(glv.glvToken);
    markets.map((market: string) => {
      if (!allMarkets.includes(market)) allMarkets.push(market);
      calls.push({
        target: market.toLowerCase(),
        params: glv.glvToken,
      });
    });
  });

  const [priceData, balances, symbols, supplies] = await Promise.all([
    getTokenAndRedirectDataMap(allMarkets, chain, timestamp),
    api.multiCall({
      calls,
      abi: "erc20:balanceOf",
      withMetadata: true,
    }),
    api.multiCall({
      calls: allGlvs.map((target: string) => ({
        target,
      })),
      abi: "erc20:symbol",
    }),
    api.multiCall({
      calls: allGlvs.map((target: string) => ({
        target,
      })),
      abi: "erc20:totalSupply",
    }),
  ]);

  let aums: { [address: string]: number } = {};
  balances.map(({ input, output, success }: any) => {
    if (!success) throw new Error("Failed to get balance");
    const { target, params } = input;
    if (!(target in priceData))
      throw new Error("Missing price data for underlying");
    const glv = params[0];
    if (!(glv in aums)) aums[glv] = 0;
    const { price, decimals } = priceData[target];
    const assetValue = (output / 10 ** decimals) * price;
    aums[glv] += assetValue;
  });

  const writes: Write[] = [];

  allGlvs.map((glv: string, i: number) => {
    const price = (aums[glv] * 10 ** 18) / supplies[i];
    addToDBWritesList(
      writes,
      chain,
      glv,
      price,
      18,
      symbols[i],
      timestamp,
      "glv",
      0.9,
    );
  });

  return writes;
}

export function glv(timestamp: number = 0) {
  return getTokenPrices("arbitrum", timestamp);
}
