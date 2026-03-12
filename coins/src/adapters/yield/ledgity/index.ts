import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import { calculate4626Prices } from "../../utils/erc4626";

const vaultConfig: {
  [chain: string]: {
    lyUSD?: string;
    lyEUR?: string;
  };
} = {
  ethereum: {
    lyUSD: "0x3C769d0e8D21d380228dFB7918c6933bb6ecB6D4",
    lyEUR: "0x20968165B7d2cDF33aF632aAB3e0539848d44BC8"
  },
  sonic: {
    lyUSD: "0x65f75c675Cc76474662DfBF7B6e8683764223001"
  },
  arbitrum: {
    lyUSD: "0x283F35b6406a0e19a786ed119869eF2c0fE157Ee"
  },
  base: {
    lyUSD: "0x916f179D5D9B7d8Ad815AC2f8570aabF0C6a6e38",
    lyEUR: "0xFaA1e3720e6Ef8cC76A800DB7B3dF8944833b134"
  },
  linea: {
    lyUSD: "0x43b3c64dbc95F9eD83795E051fc00014059e698F"
  }
};

const chainlinkEurUsdOracles: { [chain: string]: string } = {
  ethereum: "0xb49f677943BC038e9857d61E7d053CaA2C1734C1",
  base: "0x4b08a30c6208681eFF2980981057ce4C8bCB2310"
};

async function getTokenPrices(chain: string, timestamp: number) {
  const config = vaultConfig[chain];
  if (!config) return [];

  const writes: Write[] = [];

  if (config.lyUSD) {
    const usdWrites = await calculate4626Prices(
      chain,
      timestamp,
      [config.lyUSD],
      "ledgity"
    );
    writes.push(...usdWrites);
  }

  if (config.lyEUR) {
    const chainLinkOracle = chainlinkEurUsdOracles[chain];
    if (!chainLinkOracle) {
      console.log(
        `No Chainlink EUR/USD oracle configured for ${chain}, skipping lyEUR`
      );
      return writes;
    }

    const api = await getApi(chain, timestamp);
    const chainLinkOracleLatestRoundDataAbi = {
      inputs: [],
      name: "latestRoundData",
      outputs: [
        { internalType: "uint80", name: "roundId", type: "uint80" },
        { internalType: "int256", name: "answer", type: "int256" },
        { internalType: "uint256", name: "startedAt", type: "uint256" },
        { internalType: "uint256", name: "updatedAt", type: "uint256" },
        { internalType: "uint80", name: "answeredInRound", type: "uint80" }
      ],
      stateMutability: "view",
      type: "function"
    };

    const [roundId, eurUSDPrice, , updatedAt, answeredInRound] = await api.call(
      {
        target: chainLinkOracle,
        abi: chainLinkOracleLatestRoundDataAbi
      }
    );

    const STALENESS_THRESHOLD = 3 * 60 * 60;
    const now = timestamp || Math.floor(Date.now() / 1000);
    if (
      Number(eurUSDPrice) <= 0 ||
      Number(roundId) === 0 ||
      Number(answeredInRound) < Number(roundId) ||
      now - Number(updatedAt) > STALENESS_THRESHOLD
    ) {
      console.log(
        `Chainlink EUR/USD oracle on ${chain} returned invalid or stale data, skipping lyEUR`
      );
      return writes;
    }

    const eurWrites = await calculate4626Prices(
      chain,
      timestamp,
      [config.lyEUR],
      "ledgity"
    );

    const eurUSDRate = Number(eurUSDPrice) / 1e8;
    const adjustedEurWrites = eurWrites.map((write: Write) => ({
      ...write,
      price: write?.price ? write.price * eurUSDRate : undefined
    }));

    writes.push(...adjustedEurWrites);
  }

  return writes;
}

export function ledgity(timestamp: number = 0) {
  return Promise.all(
    Object.keys(vaultConfig).map((chain) => getTokenPrices(chain, timestamp))
  );
}
