import fetch from "node-fetch";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

type Config = {
  chain: string;
  rate: (params: any) => Promise<number>;
  address: string;
  underlying: string;
  underlyingChain?: string;
  symbol?: string;
  decimals?: string;
  confidence?: number;
};
const margin = 3 * 60 * 60; // 3hrs

const configs: { [adapter: string]: Config } = {
  LiNEAR: {
    rate: async ({ t }) => {
      const res = await fetch(
        `https://gateway-arbitrum.network.thegraph.com/api/${process.env.GRAPH_API_KEY}/subgraphs/id/H5F5XGL2pYCBY89Ycxzafq2RkLfqJvM47X533CwwPNjg`,
        {
          headers: {
            accept: "*/*",
            "accept-language": "en-GB,en;q=0.8",
            "content-type": "application/json",
            priority: "u=1, i",
            "sec-ch-ua":
              '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "sec-gpc": "1",
            Referer: "https://app.linearprotocol.org/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
          body: '{"query":"{\\n  prices(first: 1, orderBy: timestamp, orderDirection: desc) {\\n    id\\n    timestamp\\n    price\\n    __typename\\n  }\\n}","variables":{}}',
          method: "POST",
        },
      ).then((r) => r.json());
      if (!("data" in res)) throw new Error(`LiNEAR subgraph call failed`);
      const { timestamp, price } = res.data.prices[0];
      if (t - timestamp > margin) throw new Error(`LiNEAR subgraph stale rate`);
      return price;
    },
    underlyingChain: "ethereum",
    decimals: "0",
    chain: "coingecko",
    address: "linear-protocol",
    underlying: "0x85f17cf997934a597031b2e18a9ab6ebd4b9f6a4",
    symbol: "LINEAR",
    confidence: 1.01,
  },
  USCC: {
    rate: async ({ t }) => {
      const res = await fetch(
        "https://api.superstate.co/v1/funds/2/nav-daily",
      ).then((r) => r.json());
      const { net_asset_value, net_asset_value_date } = res[0];

      const [month, day, year] = net_asset_value_date.split("/");
      const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      const timestamp = Math.floor(date.getTime() / 1000);

      const margin = 7 * 24 * 60 * 60; // use this margin since no data over weekends
      if (t - timestamp > margin) throw new Error(`USCC stale rate`);
      return net_asset_value;
    },
    chain: "ethereum",
    address: "0x14d60e7fdc0d71d8611742720e4c50e7a974020c",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  stSTX: {
    rate: async () => {
      const res = await fetch(
        "https://app.stackingdao.com/.netlify/functions/stats",
      ).then((r) => r.json());
      return res.ratio;
    },
    chain: "stacks",
    address: "sp4sze494vc2yc5jyg7ayfq44f5q4pyv7dvmdpbg.ststx-token::ststx",
    underlying: "sp102v8p0f7jx67arq77wea3d3cfb5xw39redt0am.token-wstx",
    decimals: "6",
    symbol: "stSTX",
  },
  LBTCv: {
    rate: async ({ t }) => {
      const api = await getApi("ethereum", t, true);
      const [tvls, supply] = await Promise.all([
        fetch("https://api.llama.fi/protocol/lombard-vault").then((r) =>
          r.json(),
        ),
        api.call({
          abi: "erc20:totalSupply",
          target: "0x5401b8620E5FB570064CA9114fd1e135fd77D57c",
        }),
      ]);
      const tvl = tvls.tvl.reduce(
        (
          prev: { date: number; totalLiquidityUSD: number },
          curr: { date: number; totalLiquidityUSD: number },
        ) => (Math.abs(curr.date - t) < Math.abs(prev.date - t) ? curr : prev),
      );
      if (Math.abs(tvl.date - t) > 8 * margin)
        throw new Error(`no TVL data for Lombard Vault at this time`);
      return (tvl.totalLiquidityUSD * 1e8) / supply;
    },
    chain: "ethereum",
    address: "0x5401b8620E5FB570064CA9114fd1e135fd77D57c",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: "8",
    symbol: "LBTCv",
  },
  stSUI: {
    rate: async () =>
      await fetch("https://api.alphafi.xyz/stsui/price").then((r) => r.json()),
    chain: "sui",
    address:
      "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI",
    underlying:
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    decimals: "9",
    symbol: "stSUI",
  },
  mCAKE: {
    rate: async () => {
      const res = await fetch(
        "https://explorer.pancakeswap.com/api/cached/pools/stable/bsc/0xc54d35a8Cfd9f6dAe50945Df27A91C9911A03ab1",
      ).then((r) => r.json());
      return res.token0Price;
    },
    chain: "bsc",
    address: "0x581fa684d0ec11ccb46b1d92f1f24c8a3f95c0ca",
    underlying: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
    decimals: "18",
    symbol: "mCAKE",
  },
};

export async function apiDerivs(timestamp: number) {
  return Promise.all(
    Object.keys(configs).map((k: string) =>
      deriv(timestamp, k, configs[k]).catch((e) => {
        console.log(e);
        return [];
      }),
    ),
  );
}

async function deriv(timestamp: number, projectName: string, config: Config) {
  const {
    chain,
    underlying,
    address,
    underlyingChain,
    symbol,
    decimals,
    confidence,
  } = config;
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const pricesObject: any = {
    [address]: {
      underlying,
      price: await config.rate({ t }),
      symbol,
      decimals,
      confidence,
    },
  };

  const writes: Write[] = [];
  return (
    await getWrites({
      underlyingChain,
      chain,
      timestamp,
      pricesObject,
      projectName,
      writes,
      confidence,
    })
  ).filter((w) => !isNaN(w.price ?? NaN));
}
