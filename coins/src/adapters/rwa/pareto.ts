import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const config: {
  [chain: string]: {
    [symbol: string]: {
      address: string;
      target: string;
      decimals: number;
    };
  };
} = {
  ethereum: {
    AA_idle_Fasanara: {
      address: "0x45054c6753b4Bce40C5d54418DabC20b070F85bE",
      target: "0xf6223C567F21E33e859ED7A045773526E9E3c2D5",
      decimals: 6,
    },
    AA_BastionUSDC: {
      address: "0xC49b4ECc14aa31Ef0AD077EdcF53faB4201b724c",
      target: "0x4462eD748B8F7985A4aC6b538Dfc105Fce2dD165",
      decimals: 6,
    },
    AA_AdaptiveFrontierUSDC: {
      address: "0xae7913c672c7F1f76C2a1a0Ac4de97d082681234",
      target: "0x14B8E918848349D1e71e806a52c13D4e0d3246E0",
      decimals: 6,
    },
  },
  optimism: {
    AA_FalconXUSDC: {
      address: "0x24e16F9Fad32891f8bA69cE8fEdd273A2649331A",
      target: "0xD2c0D848aA5AD1a4C12bE89e713E70B73211989B",
      decimals: 6,
    },
  },
  arbitrum: {
    AA_BastionUSDT: {
      address: "0x97F476F664A95106931f78113489e0361Cf1c9Fa",
      target: "0x3919396Cd445b03E6Bb62995A7a4CB2AC544245D",
      decimals: 6,
    },
  },
  polygon: {
    AA_BastionUSDT: {
      address: "0xaE65d6C295E4a28519182a632FB25b7C1966AED7",
      target: "0xF9E2AE779a7d25cDe46FccC41a27B8A4381d4e52",
      decimals: 6,
    },
  },
};

export async function getTokenPrices(
  chain: string,
  timestamp: number
): Promise<Write[]> {
  const tokens = config[chain];
  const ethApi = await getApi(chain, timestamp);

  const targets = Object.values(tokens).map((t) => t.target);
  const [prices, underlyings] = await Promise.all([
    ethApi.multiCall({
      abi: "uint256:priceAA",
      calls: targets,
    }),
    ethApi.multiCall({
      abi: "address:token",
      calls: targets,
    }),
  ]);

  const pricesObject = prices.reduce((acc, price, index) => {
    const tokenName = Object.keys(tokens)[index];
    const tokenInfo = tokens[tokenName];
    const underlying = underlyings[index];
    return {
      ...acc,
      [tokenInfo.address]: {
        underlying,
        decimals: 18,
        symbol: tokenName,
        price: Number(price) / Number(`1e${tokenInfo.decimals}`),
      },
    };
  }, {});

  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "pareto",
  });
}

export function pareto(timestamp: number = 0) {
  return Promise.all(
    Object.keys(config).map((chain) => getTokenPrices(chain, timestamp))
  );
}
