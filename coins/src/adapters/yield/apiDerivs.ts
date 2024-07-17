import fetch from "node-fetch";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";
import * as sdk from "@defillama/sdk";
import { request, gql } from "graphql-request";

type Config = {
  chain: string;
  rate: (params: any) => Promise<number>;
  address: string;
  underlying: string;
  underlyingChain?: string;
  symbol?: string;
  decimals?: string;
  confidence?: number
};
const margin = 3 * 60 * 60; // 3hrs

const configs: { [adapter: string]: Config } = {
  LiNEAR: {
    rate: async ({ t }) => {
      const res = await fetch(
        "https://gateway-arbitrum.network.thegraph.com/api/e5a80a42743d120ed405223ae2059bde/subgraphs/id/H5F5XGL2pYCBY89Ycxzafq2RkLfqJvM47X533CwwPNjg",
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
    confidence: 1,
  },
};

export async function apiDerivs(timestamp: number) {
  return Promise.all(
    Object.keys(configs).map((k: string) => deriv(timestamp, k, configs[k])),
  );
}

async function deriv(timestamp: number, projectName: string, config: Config) {
  const { chain, underlying, address, underlyingChain, symbol, decimals, confidence } =
    config;
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const pricesObject: any = {
    [address]: {
      underlying,
      price: await config.rate({ t }),
      symbol,
      decimals,
      confidence
    },
  };

  const writes: Write[] = [];
  return await getWrites({
    underlyingChain,
    chain,
    timestamp,
    pricesObject,
    projectName,
    writes,
    confidence
  });
}
