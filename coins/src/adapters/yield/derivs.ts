import { getCurrentUnixTimestamp } from "../../utils/date";
import { nullAddress } from "../../utils/shared/constants";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

type Config = {
  chain: string;
  rate: (params: any) => Promise<number>;
  address: string;
  underlying?: string;
  symbol?: string;
  decimals?: number;
  confidence?: number;
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
    underlying: "0x0000000000000000000000000000000000000000",
    symbol: "wstMTRG",
    decimals: 18,
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
  // Re7BTC: {
  //   rate: lrts("0x7F43fDe12A40dE708d908Fb3b9BFB8540d9Ce444"),
  //   chain: "ethereum",
  //   address: "0x7F43fDe12A40dE708d908Fb3b9BFB8540d9Ce444",
  // },
  weETHk: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function getRate() external view returns (uint256)",
        target: "0x126af21dc55C300B7D0bBfC4F3898F558aE8156b",
      });
      return rate / 1e18;
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
  stALT: {
    rate: async ({ api }) => {
      const [supply, balance] = await Promise.all([
        api.call({
          abi: "erc20:totalSupply",
          target: "0xb6D149C8DdA37aAAa2F8AD0934f2e5682C35890B",
        }),
        api.call({
          abi: "erc20:balanceOf",
          target: "0x8457ca5040ad67fdebbcc8edce889a335bc0fbfb",
          params: "0xb6D149C8DdA37aAAa2F8AD0934f2e5682C35890B",
        }),
      ]);
      return balance / supply;
    },
    chain: "ethereum",
    underlying: "0x8457ca5040ad67fdebbcc8edce889a335bc0fbfb",
    address: "0xb6D149C8DdA37aAAa2F8AD0934f2e5682C35890B",
  },
  LFT: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function convertToAssets(uint256) external view returns (uint256)",
        target: "0x270Ee1564eC483DD83f284E4D7bDFbfaa2feA76E",
        params: 1e12,
      });
      return rate / 1e12;
    },
    chain: "base",
    underlying: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    address: "0x8c213ee79581Ff4984583C6a801e5263418C4b86",
  },
  USDO: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function convertToAssets(uint256) external view returns (uint256)",
        target: "0xaD55aebc9b8c03FC43cd9f62260391c13c23e7c0",
        params: 1e12,
      });
      return 1e12 / rate;
    },
    chain: "ethereum",
    underlying: "0xaD55aebc9b8c03FC43cd9f62260391c13c23e7c0",
    address: "0x8238884Ec9668Ef77B90C6dfF4D1a9F4F4823BFe",
  },
  asBNB: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function convertToTokens(uint256) external view returns (uint256)",
        target: "0x2F31ab8950c50080E77999fa456372f276952fD8",
        params: 1e12,
      });
      return 1e12 / rate;
    },
    chain: "bsc",
    underlying: "0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B", // slisBNB
    address: "0x77734e70b6e88b4d82fe632a168edf6e700912b6", // asBNB
  },
  vIP: {
    rate: async ({ api }) => {
      const target = await api.call({
        abi: "address:stakePool",
        target: "0x20Cb9DCb6FC306c31325bdA6221AA5e067B9Da51",
      });
      const rate = await api.call({
        abi: "function calculateIPWithdrawal(uint256) view returns (uint256)",
        target,
        params: 1e12,
      });
      return rate / 1e12;
    },
    chain: "sty",
    underlying: nullAddress, // IP
    address: "0x5267F7eE069CEB3D8F1c760c215569b79d0685aD",
  },
  hywstHYPE: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:balancePerShare",
        target: "0xfFaa4a3D97fE9107Cef8a3F48c069F577Ff76cC1",
      });
      return rate / 1e18;
    },
    chain: "hyperliquid",
    underlying: "0xfFaa4a3D97fE9107Cef8a3F48c069F577Ff76cC1",
    address: "0xC8b6E0acf159E058E22c564C0C513ec21f8a1Bf5",
    confidence: 1,
  },
  sUSDa: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function getAmountByShares(uint256) view returns (uint256)",
        target: "0x01e3cc8E17755989ad2CAFE78A822354Eb5DdFA6",
        params: 1e12,
      });
      return rate / 1e12;
    },
    chain: "ethereum",
    underlying: "0x8A60E489004Ca22d775C5F2c657598278d17D9c2",
    address: "0x2B66AAdE1e9C062FF411bd47C44E0Ad696d43BD9",
    confidence: 1,
  },
  JSTRY: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function convertToAssets(uint256 shares) external view returns (uint256)",
        target: "0x36036fFd9B1C6966ab23209E073c68Eb9A992f50",
        params: 1e12,
      });
      return rate / 1e12;
    },
    chain: "ethereum",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    address: "0x8c213ee79581Ff4984583C6a801e5263418C4b86",
    confidence: 1,
  },
  M: {
    rate: async ({ api }) => {
      const [assets, supply] = await Promise.all([
        api.call({
          abi: "erc20:balanceOf",
          target: "0x866A2BF4E572CbcF37D5071A7a58503Bfb36be1b",
          params: "0x437cc33344a0B27A429f795ff6B469C72698B291",
        }),
        api.call({
          abi: "erc20:totalSupply",
          target: "0x437cc33344a0B27A429f795ff6B469C72698B291",
        }),
      ]);
      return supply / assets;
    },
    chain: "ethereum",
    underlying: "0x437cc33344a0B27A429f795ff6B469C72698B291",
    address: "0x866A2BF4E572CbcF37D5071A7a58503Bfb36be1b",
  },
  mHYPE: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:exchangeRateToUnderlying",
        target: "0xdAbB040c428436d41CECd0Fb06bCFDBAaD3a9AA8",
      });
      return rate / 1e18;
    },
    chain: "hyperliquid",
    underlying: "0x0d01dc56dcaaca66ad901c959b4011ec",
    address: "0xdAbB040c428436d41CECd0Fb06bCFDBAaD3a9AA8",
  },
  USH: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:fetchPrice",
        target: "0xDc4ddde1EeaF64d77B23B794b89BfBe281B5Ce35",
      });
      return rate / 1e18;
    },
    chain: "hyperliquid",
    underlying: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
    address: "0x8fF0dd9f9C40a0d76eF1BcFAF5f98c1610c74Bd8",
  },
  eliteRingsScUSD: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:getRate",
        target: "0x13cCc810DfaA6B71957F2b87060aFE17e6EB8034",
      });
      return rate / 1e6;
    },
    chain: "sonic",
    underlying: "0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE",
    address: "0xd4aA386bfCEEeDd9De0875B3BA07f51808592e22",
  },
  BPRO: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function getUnderlyingPrice(address cToken) external view returns (uint256)",
        target: "0x7fa5500c978e89660bf3bd0526f8f7164de0b38f",
        params: "0x440cd83c160de5c96ddb20246815ea44c7abbca8",
      });
      return rate / 1e18;
    },
    chain: "rsk",
    underlying: "0xEf213441a85DF4d7acBdAe0Cf78004E1e486BB96",
    address: "0x440cd83c160de5c96ddb20246815ea44c7abbca8",
  },
  GPRIME: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:sharePrice",
        target: "0x508c74Ba01cDa8Bf088969398d18e7Ab1ec3B6AA",
      });
      return rate / 1e18;
    },
    chain: "plume_mainnet",
    underlying: "0x78adD880A697070c1e765Ac44D65323a0DcCE913",
    address: "0x508c74Ba01cDa8Bf088969398d18e7Ab1ec3B6AA",
  },
  "stk-ePendle": {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:exchangeRate",
        target: "0xd302d7fd2c9375a433018fdfa5613be6ad3f18e3",
      });
      return rate / 1e18;
    },
    chain: "arbitrum",
    underlying: "0x3EaBE18eAE267D1B57f917aBa085bb5906114600",
    address: "0x37227785a1f4545ed914690e395e4CFE96B8319f",
  },
  vkHYPE: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:getRate",
        target: "0x74392Fa56405081d5C7D93882856c245387Cece2",
      });
      return rate / 1e18;
    },
    chain: "hyperliquid",
    underlying: "0x0000000000000000000000000000000000000000",
    address: "0x9BA2EDc44E0A4632EB4723E81d4142353e1bB160",
  },
  HiHYPE: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function kHYPEToHYPE(uint256) external view returns (uint256)",
        target: "0x62E6fa898761dE2345aB3d507b72c422a2829733",
        params: "1000000000000000000",
      });
      return rate / 1e18;
    },
    chain: "hyperliquid",
    underlying: "0x0000000000000000000000000000000000000000",
    address: "0x4f322145abedb2b39f69e7d4531ab4b2e6483154",
  },
  "SJ-wartBTC": {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function underlyingToWrapper(uint256) external view returns (uint256)",
        target: "0x0238E736166e07D6F857A0E322dAd4e7C1AFF4F3",
        params: 1e6,
      });
      return rate / 1e6;
    },
    chain: "goat",
    underlying: "0x02F294cC9Ceb2c80FbA3fD779e17FE191Cc360C4",
    address: "0x0238E736166e07D6F857A0E322dAd4e7C1AFF4F3",
  },
  AA_FalconXUSDC: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function virtualPrice(address) external view returns (uint256)",
        target: "0x433D5B175148dA32Ffe1e1A37a939E1b7e79be4d",
        params: "0xC26A6Fa2C37b38E549a4a1807543801Db684f99C",
      });
      return rate / 1e6;
    },
    chain: "ethereum",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    address: "0xC26A6Fa2C37b38E549a4a1807543801Db684f99C",
  },
  bravUSDC: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:assetsPerShare",
        target: "0x9f96E4B65059b0398B922792d3fF9F10B4567533",
      });
      return rate / 1e6;
    },
    chain: "ethereum",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    address: "0x9f96E4B65059b0398B922792d3fF9F10B4567533",
  },
  brETH: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:assetsPerShare",
        target: "0x3588e6Cb5DCa99E35bA2E2a5D42cdDb46365e71B",
      });
      return rate / 1e18;
    },
    chain: "ethereum",
    underlying: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    address: "0x3588e6Cb5DCa99E35bA2E2a5D42cdDb46365e71B",
  },
  hwHYPE: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:getRate",
        target: "0xCf9be8BF79ad26fdD7aA73f3dd5bA73eCDee2a32",
      });
      return rate / 1e18;
    },
    chain: "hyperliquid",
    underlying: "0x5555555555555555555555555555555555555555",
    address: "0x4DE03cA1F02591B717495cfA19913aD56a2f5858",
  },
  sigmaSP: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:nav",
        target: "0x2b9c1f069ddcd873275b3363986081bda94a3aa3",
      });
      return rate / 1e18;
    },
    chain: "bsc",
    underlying: "0x55d398326f99059fF775485246999027B3197955",
    address: "0x2b9c1f069ddcd873275b3363986081bda94a3aa3",
  },
  xUSD: {
    rate: async ({ api }) => {
      const round = await api.call({
        abi: "uint256:round",
        target: "0xe2fc85bfb48c4cf147921fbe110cf92ef9f26f94",
      });
      const rate = await api.call({
        abi: "function roundPricePerShare(uint256) external view returns (uint256)",
        target: "0xe2fc85bfb48c4cf147921fbe110cf92ef9f26f94",
        params: round - 1,
      });
      return rate / 1e6;
    },
    chain: "ethereum",
    underlying: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    address: "0xe2fc85bfb48c4cf147921fbe110cf92ef9f26f94",
  },
  sGHO: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function getExchangeRate() external view returns (uint216)",
        target: "0x1a88Df1cFe15Af22B3c4c783D4e6F7F9e0C1885d",
      });
      return rate / 1e18;
    },
    chain: "ethereum",
    underlying: "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f",
    address: "0x1a88Df1cFe15Af22B3c4c783D4e6F7F9e0C1885d",
  },
  RYT: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "uint256:latestNAV",
        target: "0x75bA0077D78c78e24018C2dFDC4722493b281014",
      });
      return rate / 1e4;
    },
    chain: "ethereum",
    underlying: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    address: "0x1D06aa46994f2aba30F6eeD46b315664460a709A",
  },
  stXTZ: {
    rate: async ({ api, timestamp }) => {
      const res = await api.call({
        abi: "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
        target: "0x4Bf5C46Ee59a1110c2a242715f9c3b548A14ee02",
      });
      if (res.updatedAt / 1000 < timestamp - 3 * 60 * 60)
        throw new Error(`stXTZ stale rate`);
      return res.answer / 1e6;
    },
    chain: "etlk",
    underlying: "0xc9b53ab2679f573e480d01e0f49e2b5cfb7a3eab",
    address: "0x01F07f4d78d47A64F4C3B2b65f513f15Be6E1854",
  },
  "CASH+": {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function latestAnswer() external view returns (uint256)",
        target: "0x66C0dB1A21047f0c156d2F39b33B1A47E9fE4583",
      });
      return rate / 1e18;
    },
    chain: "ethereum",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    address: "0x498D9329555471bF6073A5f2D047F746d522A373",
  },
  strETH: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function getReport(address asset) external view returns (tuple(uint224 priceD18, uint32 timestamp, bool isSuspicious))",
        target: "0x8a78e6b7E15C4Ae3aeAeE3bf0DE4F2de4078c1cD",
        params: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      });
      return 1e18 / rate.priceD18;
    },
    chain: "ethereum",
    underlying: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    address: "0xcd3c0F51798D1daA92Fb192E57844Ae6cEE8a6c7",
  },
  ankrFLOWEVM: {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function sharesToBonds(uint256) external view returns (uint256)",
        target: "0x1b97100ea1d7126c4d60027e231ea4cb25314bdb",
        params: "1000000",
      });
      return 1e6 / rate;
    },
    chain: "flow",
    underlying: "0xd3bf53dac106a0290b0483ecbc89d40fcc961f3e",
    address: "0x1b97100ea1d7126c4d60027e231ea4cb25314bdb",
    confidence: 1,
  },
  earnAUSD: {
    rate: async ({ api }) => {
      const [assets, supply] = await Promise.all([
        api.call({
          abi: "uint256:getTotalAssets",
          target: "0x36eDbF0C834591BFdfCaC0Ef9605528c75c406aA",
        }),
        api.call({
          abi: "erc20:totalSupply",
          target: "0x103222f020e98bba0ad9809a011fdf8e6f067496",
        }),
      ]);
      return assets / supply;
    },
    chain: "monad",
    underlying: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
    address: "0x103222f020e98bba0ad9809a011fdf8e6f067496",
  },
  sMON: {
    rate: async ({ api }) => {
      const assets = await 
        api.call({
          abi: "function convertToAssets(uint96 shares) external view returns (uint96 assets)",
          target: "0xA3227C5969757783154C60bF0bC1944180ed81B9",
          params: "1000000"
        })
      return assets / 1000000;
    },
    chain: "monad",
    underlying: "0x0000000000000000000000000000000000000000",
    address: "0xA3227C5969757783154C60bF0bC1944180ed81B9",
  },
  "stBTC": {
    rate: async ({ api }) => {
      const rate = await api.call({
        abi: "function latestAnswer() external view returns (uint256)",
        target: "0x6d88d2718cfA50EcCf4743ed8E6Bd4A0716a4708",
      });
      return rate / 1e18;
    },
    chain: "btnx",
    underlying: "0x29ee6138dd4c9815f46d34a4a1ed48f46758a402",
    address: "0xf4586028ffda7eca636864f80f8a3f2589e33795",
    confidence: 1
  },
};

export async function derivs(timestamp: number) {
  return Promise.all(
    Object.keys(configs).map((k: string) =>
      deriv(timestamp, k, configs[k]).catch((e) => {
        console.log(`API deriv ${k} failed with ${e?.message ?? e}`);
      })
    )
  );
}

async function deriv(timestamp: number, projectName: string, config: Config) {
  const { chain, underlying, address, symbol, decimals, confidence } = config;
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);
  const pricesObject: any = {
    [address]: {
      underlying,
      symbol,
      decimals,
      price: await config.rate({ api, timestamp }),
    },
  };

  const writes: Write[] = [];
  return await getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName,
    writes,
    confidence,
  });
}
