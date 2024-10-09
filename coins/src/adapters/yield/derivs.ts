import { getCurrentUnixTimestamp } from "../../utils/date";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";
import * as sdk from "@defillama/sdk";

type Config = {
  chain: string;
  rate: (params: any) => Promise<number>;
  address: string;
  underlying?: string;
  underlyingChain?: string;
  symbol?: string;
  decimals?: number;
};

const lrts = (target: string) => {
  return async ({ api }: any) => {
    const balances = new sdk.Balances({ chain: api.chain, timestamp: api.timestamp });
    const [assets, supply, decimals,] = await Promise.all([
      api.call({ abi: "function underlyingTvl() view returns (address[] tokens, uint256[] amounts)", target, }),
      api.call({ abi: "erc20:totalSupply", target }),
      api.call({ abi: "erc20:decimals", target }),
    ]);
    balances.add(assets.tokens, assets.amounts)
    const usdValue = await balances.getUSDValue()
    return usdValue / (supply / 10 ** decimals);
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
  },
  Re7LRT: {
    rate: lrts("0x84631c0d0081fde56deb72f6de77abbbf6a9f93a"),
    chain: "ethereum",
    address: "0x84631c0d0081fde56deb72f6de77abbbf6a9f93a",
  },
  Re7BTC: {
    rate: lrts("0x7F43fDe12A40dE708d908Fb3b9BFB8540d9Ce444"),
    chain: "ethereum",
    address: "0x7F43fDe12A40dE708d908Fb3b9BFB8540d9Ce444",
  },
  amphrETH: {
    rate: lrts("0x5fd13359ba15a84b76f7f87568309040176167cd"),
    chain: "ethereum",
    address: "0x5fd13359ba15a84b76f7f87568309040176167cd",
  },
  rstETH: {
    rate: lrts("0x7a4effd87c2f3c55ca251080b1343b605f327e3a"),
    chain: "ethereum",
    address: "0x7a4effd87c2f3c55ca251080b1343b605f327e3a",
  },
  weETHk: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function getRate() external view returns (uint256)",
        target: "0x126af21dc55C300B7D0bBfC4F3898F558aE8156b",
      });
      return rate / 1e10;
    },
    chain: "ethereum",
    underlying: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    address: "0x7223442cad8e9ca474fc40109ab981608f8c4273",
  },
  USTB: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function latestAnswer() external view returns (uint256)",
        target: "0x289B5036cd942e619E1Ee48670F98d214E745AAC",
      });
      return rate / 1e6;
    },
    chain: "ethereum",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    address: "0x43415eB6ff9DB7E26A15b704e7A3eDCe97d31C4e",
  },
  ETHRDNTUNIV3: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function getLpTokenPrice() external view returns (uint256)",
        target: "0x8096240D997a25f3d11a2354659A16eA3886fcFF",
      });
      return rate / 1e8;
    },
    chain: "base",
    underlying: "0x4200000000000000000000000000000000000006",
    address: "0x8A76639FE8e390Ed16eA88f87BEB46d6A5328254",
  },
  USTBL: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function getLatestPrice() external view returns (uint256)",
        target: "0x021289588cd81dC1AC87ea91e91607eEF68303F5",
      });
      return rate / 1e6;
    },
    chain: "ethereum",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    address: "0xe4880249745eAc5F1eD9d8F7DF844792D560e750",
  },
  EUTBL: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function getLatestPrice() external view returns (uint256)",
        target: "0x29503f31B73F0734455942Eb888E13acA1588a4e",
      });
      return rate / 1e6;
    },
    chain: "ethereum",
    underlying: "0x1abaea1f7c830bd89acc67ec4af516284b1bc33c",
    address: "0xa0769f7A8fC65e47dE93797b4e21C073c117Fc80",
  },
  aETH: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function convertToAETH(uint256) external view returns (uint256)",
        target: "0x25a01dBde45cc5Bb7071EB3c3b2F983ea923bec5",
        params: "1000000",
      });
      return rate / 1e6;
    },
    chain: "ethereum",
    underlying: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    address: "0xFC87753Df5Ef5C368b5FBA8D4C5043b77e8C5b39",
  },
  iwstETH: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function exchangeRateStored() external view returns (uint256)",
        target: "0x4B3488123649E8A671097071A02DA8537fE09A16",
      });
      return rate / 1e18;
    },
    chain: "optimism",
    underlying: "0x1f32b1c2345538c0c6f582fcb022739c4a194ebb",
    address: "0x4B3488123649E8A671097071A02DA8537fE09A16",
  },
  FIUSD: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function latestAnswer() external view returns (uint256)",
        target: "0xC406104c42211abd1A2cD411DDd071511515bDdd",
      });
      return rate / 1e18;
    },
    chain: "era",
    underlying: "0x1d17cbcf0d6d143135ae902365d2e5e2a16538d4",
    address: "0x2AB105A3eAd22731082B790CA9A00D9A3A7627F9",
  },
};

export async function derivs(timestamp: number) {
  return Promise.all(
    Object.keys(configs).map((k: string) => deriv(timestamp, k, configs[k])),
  );
}

async function deriv(timestamp: number, projectName: string, config: Config) {
  const { chain, underlying, address, underlyingChain, symbol, decimals, } =
    config;
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);
  const pricesObject: any = {
    [address]: {
      underlying, symbol, decimals,
      price: await config.rate({ api, timestamp }),
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
