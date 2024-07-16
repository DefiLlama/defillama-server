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
};

const lrts = (target: string) => {
  return async ({ api }: any) => {
    const [assets, supply] = await Promise.all([
      api.call({
        abi: {
          inputs: [],
          name: "underlyingTvl",
          outputs: [
            { internalType: "address[]", name: "tokens", type: "address[]" },
            { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
          ],
          stateMutability: "view",
          type: "function",
        },
        target,
      }),
      api.call({ abi: "erc20:totalSupply", target }),
    ]);
    return assets.amounts[0] / supply;
  };
};

const configs: { [adapter: string]: Config } = {
  osETH: {
    rate: async ({ api }) => {
      const raw = await api.call({
        abi: "uint256:getRate",
        target: "0x8023518b2192FB5384DAdc596765B3dD1cdFe471",
      });
      return raw / 10 ** 18;
    },
    chain: "ethereum",
    address: "0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38",
    underlying: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  weETH: {
    rate: async ({ api }) => {
      const raw = await api.call({
        abi: "function getEETHByWeETH(uint256) view returns (uint256)",
        target: "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee",
        params: [1e10],
      });
      return raw / 10 ** 10;
    },
    chain: "ethereum",
    address: "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee",
    underlying: "0x35fA164735182de50811E8e2E824cFb9B6118ac2",
  },
  weETHarb: {
    rate: async ({ timestamp }) => {
      const api = await getApi("ethereum", timestamp, true);
      const raw = await api.call({
        abi: "function getEETHByWeETH(uint256) view returns (uint256)",
        target: "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee",
        params: [1e10],
        chain: "ethereum",
      });
      return raw / 10 ** 10;
    },
    chain: "arbitrum",
    address: "0x35751007a407ca6feffe80b3cb397736d2cf4dbe",
    underlying: "0x35fA164735182de50811E8e2E824cFb9B6118ac2",
    underlyingChain: "ethereum",
    symbol: "weETH",
    decimals: "18",
  },
  wstmtrg: {
    rate: async ({ api }) => {
      const raw = await api.call({
        target: "0xe2de616fbd8cb9180b26fcfb1b761a232fe56717",
        abi: {
          inputs: [],
          name: "stMTRGPerToken",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      });
      return raw / 10 ** 18;
    },
    chain: "meter",
    address: "0xe2de616fbd8cb9180b26fcfb1b761a232fe56717",
    underlying: "0xbd2949f67dcdc549c6ebe98696449fa79d988a9f",
    underlyingChain: "bsc",
    symbol: "wstMTRG",
    decimals: "18",
  },
  neth: {
    rate: async ({ api }) => {
      const raw = await api.call({
        abi: "function convertToAssets(uint256 _stakeAmount) external view returns (uint256)",
        target: "0xf3C79408164abFB6fD5dDfE33B084E4ad2C07c18",
        params: [1e10],
      });
      return raw / 1e10;
    },
    chain: "ethereum",
    address: "0xC6572019548dfeBA782bA5a2093C836626C7789A",
    underlying: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  rneth: {
    rate: async ({ api }) => {
      const raw = await api.call({
        abi: "function convertToAssets(uint256 _stakeAmount) external view returns (uint256)",
        target: "0x0d6F764452CA43eB8bd22788C9Db43E4b5A725Bc",
        params: [1e10],
      });
      return raw / 1e10;
    },
    chain: "ethereum",
    address: "0x9Dc7e196092DaC94f0c76CFB020b60FA75B97C5b",
    underlying: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  mmeth: {
    rate: async ({ api }) => {
      const raw = await api.call({
        abi: "uint256:exchangeRateToNative",
        target: "0x8a053350ca5F9352a16deD26ab333e2D251DAd7c",
      });
      return raw / 1e18;
    },
    chain: "ethereum",
    address: "0x8a053350ca5F9352a16deD26ab333e2D251DAd7c",
    underlying: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  steakLRT: {
    rate: lrts("0xBEEF69Ac7870777598A04B2bd4771c71212E6aBc"),
    chain: "ethereum",
    address: "0xBEEF69Ac7870777598A04B2bd4771c71212E6aBc",
    underlying: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
  },
  Re7LRT: {
    rate: lrts("0x84631c0d0081fde56deb72f6de77abbbf6a9f93a"),
    chain: "ethereum",
    underlying: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    address: "0x84631c0d0081fde56deb72f6de77abbbf6a9f93a",
  },
  amphrETH: {
    rate: lrts("0x5fd13359ba15a84b76f7f87568309040176167cd"),
    chain: "ethereum",
    underlying: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    address: "0x5fd13359ba15a84b76f7f87568309040176167cd",
  },
  rstETH: {
    rate: lrts("0x7a4effd87c2f3c55ca251080b1343b605f327e3a"),
    chain: "ethereum",
    underlying: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    address: "0x7a4effd87c2f3c55ca251080b1343b605f327e3a",
  },
  // weETHk: {
  //   rate: async ({ api }) => {},
  //   chain: "ethereum",
  //   underlying: "",
  //   address: "0x7223442cad8e9ca474fc40109ab981608f8c4273",
  // },
};

export async function derivs(timestamp: number) {
  return Promise.all(
    Object.keys(configs).map((k: string) => deriv(timestamp, k, configs[k])),
  );
}

async function deriv(timestamp: number, projectName: string, config: Config) {
  const { chain, underlying, address, underlyingChain, symbol, decimals } =
    config;
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);
  const pricesObject: any = {
    [address]: {
      underlying,
      price: await config.rate({ api, timestamp }),
      symbol,
      decimals,
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
  });
}
