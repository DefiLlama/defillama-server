import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

async function getTokenPrices(chain: string, timestamp: number) {
  // logic taken from hlp: https://github.com/DefiLlama/defillama-server/blob/master/coins/src/adapters/yield/hlp.ts
  const api = await getApi(chain, timestamp);
  const chainLinkOracle = "0x4b08a30c6208681eFF2980981057ce4C8bCB2310";
  const jEURx = "0xfCDecfe37463912C03A644128EB02A1147715E36";
  const chainLinkOracleLatestAnswerAbi = {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  };
  const eurUSDPrice = await api.call({
    target: chainLinkOracle,
    abi: chainLinkOracleLatestAnswerAbi,
  });
  const pricesObject: any = {
    [jEURx]: { price: eurUSDPrice / 1e8 },
  };
  const writes: Write[] = [];
  console.log({
    chain,
    timestamp,
    writes,
    pricesObject,
    projectName: "jeurx",
  });
  return getWrites({
    chain,
    timestamp,
    writes,
    pricesObject,
    projectName: "jeurx",
  });
}

export function jeurx(timestamp: number = 0) {
  return getTokenPrices("base", timestamp);
}
