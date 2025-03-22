import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";

const abis = {
  getOracle: "function getOracle(address token) external view returns (address)",
  oracleDecimals: "function decimals() external view returns (uint8)",
  latestAnswer: "function latestAnswer() external view override returns (int256)"
}


type ChainConfig = {
  oraclesRegistry: string,
  tokens: string[]
}

const configs: Record<string, ChainConfig> = {
  base: {
    oraclesRegistry: '0x6A96Db69c0FAAe20998247FAE7E79b04BFdc4DB5',
    tokens: [
      "0x35b5129e86EBE5Fd00b7DbE99aa202BE5CF5FA04"
    ]
  }
};


async function getTokenPrices(chain: string, timestamp: number): Promise<Write[]> {
  console.log("hello")
  const api = await getApi(chain, timestamp);
  const { tokens, oraclesRegistry } = configs[chain];
  const [oracles, symbols, tokenDecimals] = await Promise.all([
    api.multiCall({
      calls: tokens.map(token => ({
        target: oraclesRegistry,
        params: [token]
      })),
      abi: abis.getOracle,
    }),
    api.multiCall({
      abi: "erc20:symbol",
      calls: tokens.map(token => ({
        target: token,
      })),
    }),
    api.multiCall({
      abi: "erc20:decimals",
      calls: tokens.map(token => ({
        target: token,
      })),
    })
  ])

  const [prices, oracleDecimals] = await Promise.all([api.multiCall({
    calls: oracles.map((oracle: { output: string }) => ({
      target: oracle.output
    })),
    abi: abis.latestAnswer,
  }),
  api.multiCall({
    calls: oracles.map((oracle: { output: string }) => ({
      target: oracle.output
    })),
    abi: abis.oracleDecimals,
  })
  ]);

  const writes: Write[] = [];
  tokens.forEach((token, i) => {
    addToDBWritesList(
      writes,
      chain,
      token,
      prices[i] / 10 ** oracleDecimals[i],
      tokenDecimals[i],
      symbols[i],
      timestamp,
      "trize-rwa",
      0.8,
    );
  })

  return writes;
}

export function trize(timestamp: number): Promise<Write[]> {
  return getTokenPrices("base", timestamp);
}
console.log("tedadaw")
trize(Date.now()).then((writes) => console.log("test", writes));