import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const abi = 'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)';

const config: any = {
  ethereum: {
    rUSD: '0x09D4214C03D01F49544C0448DBE3A27f768F2b34';
    srUSD: '0x738d1115B90efa71AE468F1287fc864775e23a31';
    termIssuer: '0x128D86A9e854a709Df06b884f81EeE7240F6cCf7';
  }
}

async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  let tokens = Object.values(config[chain]) as any
  const pricesObject: any = {};
  tokens.forEach((contract: any) => {
    const price = (await api.call({ abi, target: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6' }).answer) / 1e8;
    if (isNaN(price)) return;
    pricesObject[contract] = { price };
  });

  return getWrites({ chain, timestamp, pricesObject, projectName: "reservoir-protocol", })
}

export function reservoirprotocol(timestamp: number = 0) {
  return Promise.all(Object.keys(config).map(i => getTokenPrices(i, timestamp)))
}
