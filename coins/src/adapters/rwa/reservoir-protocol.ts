import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const abi =
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)";

const config: any = {
  ethereum: {
    tokens: [
      "0x09D4214C03D01F49544C0448DBE3A27f768F2b34", // rUSD
      "0x738d1115B90efa71AE468F1287fc864775e23a31", // srUSD
      // "0x128D86A9e854a709Df06b884f81EeE7240F6cCf7", // termIssuer
    ],
    underlying: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    target: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
  },
};

async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  let { tokens, underlying, target } = config[chain];
  const pricesObject: any = {};
  const price = (await api.call({ abi, target })).answer / 1e8;
  if (isNaN(price)) throw new Error(`no latestRoundData.answer`);
  tokens.forEach(async (contract: any) => {
    pricesObject[contract] = { price, underlying };
  });

  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "reservoir-protocol",
  });
}

export function reservoirprotocol(timestamp: number = 0) {
  return Promise.all(
    Object.keys(config).map((i) => getTokenPrices(i, timestamp)),
  );
}
