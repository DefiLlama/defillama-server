import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";

const assets: { [address: string]: { feed: string; rate: number } } = {
  "0x99EBb9BFa6AF26E483fD55F92715321EB4C93aa9": {
    feed: "crypto.usdt:usd",
    rate: 1,
  },
  "0x544ff249Be54bEaba1a80b4716D576222d41236d": {
    feed: "metal.xau:usd",
    rate: 31.1,
  },
  "0x1f22a92AdcD346B0a4EAB1672F51584f15487c91": {
    feed: "metal.xag:usd",
    rate: 31.1,
  },
  "0x5270A13CeA56f15AcfA8A58378cc8a643DFfDbFa": {
    feed: "metal.xpd:usd",
    rate: 31.1,
  },
  "0xf1E087d98928B99D02c2b72412608089688A979f": {
    feed: "metal.xpt:usd",
    rate: 31.1,
  },
};

export async function altai(timestamp: number = 0) {
  const writes: Write[] = [];

  const [prices, metadata] = await Promise.all([
    getTokenAndRedirectDataMap(
      Object.values(assets).map(({ feed }) => feed),
      "pyth",
      timestamp
    ),
    getTokenInfo("bsc", Object.keys(assets), undefined, {
      timestamp,
    }),
  ]);

  Object.keys(assets).forEach((address: string, i: number) => {
    const { feed, rate } = assets[address];
    const feedData = prices[feed];

    if (!feedData) return;

    addToDBWritesList(
      writes,
      "bsc",
      address,
      feedData.price / rate,
      metadata.decimals[i].output,
      metadata.symbols[i].output,
      timestamp,
      "altai",
      0.9
    );
  });

  return writes;
}