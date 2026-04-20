import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import { getApi } from "../utils/sdk";

const token = "0x6Ce393fF9Ed5465CC4DEf456B8401e03cEF64d5e";
const poolContract = "0x35C888a9afc0866Fec5bBAdEf790e5EC1d845653";
const chain = "etlk";

// Pool layout: token0 = RARE (4 dec), token1 = USDC (6 dec)
// sqrtPriceX96 encodes the price of token0 in token1 (raw units)
// priceRAREinUSD = (sqrtPriceX96 / 2^96)^2 * 10^(4-6)

const slot0Abi = {
  inputs: [],
  name: "slot0",
  outputs: [
    { name: "sqrtPriceX96", type: "uint160" },
    { name: "tick", type: "int24" },
    { name: "observationIndex", type: "uint16" },
    { name: "observationCardinality", type: "uint16" },
    { name: "observationCardinalityNext", type: "uint16" },
    { name: "feeProtocol", type: "uint8" },
    { name: "unlocked", type: "bool" },
  ],
  stateMutability: "view",
  type: "function",
};

export function rare(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const api = await getApi(chain, timestamp, true);

  const [[decimals, symbol], slot0] = await Promise.all([
    Promise.all([
      api.call({ abi: "uint8:decimals", target: token }),
      api.call({ abi: "string:symbol", target: token }),
    ]),
    api.call({ abi: slot0Abi, target: poolContract }),
  ]);

  const sqrtPriceX96: number = slot0[0];
  const price = (sqrtPriceX96 / 2 ** 96) ** 2 * 10 ** (4 - 6);

  addToDBWritesList(
    writes,
    chain,
    token,
    price,
    decimals,
    symbol,
    timestamp,
    "rare-rwa",
    1,
  );

  return writes;
}
