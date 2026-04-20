import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import { getApi } from "../utils/sdk";

const token = "0x93F5475da60143C50e8bE3fED10c143B0CF8b9E9";
const poolContract = "0x86D2f4eF99915652bFC3Adf29683752334582B4D";
const chain = "etlk";

// Pool layout: token0 = USDC (6 dec), token1 = VNXAU (18 dec)
// sqrtPriceX96 encodes the price of token0 in token1 (raw units)
// priceRaw = (sqrtPriceX96 / 2^96)^2
// priceUSDC_in_VNXAU = priceRaw * 10^(6-18)
// priceVNXAU_in_USD  = 1 / priceUSDC_in_VNXAU

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

export function vnxau(timestamp: number = 0) {
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
  const priceRaw = (sqrtPriceX96 / 2 ** 96) ** 2;
  const priceUsdcInVnxau = priceRaw * 10 ** (6 - 18);
  const price = 1 / priceUsdcInVnxau;

  addToDBWritesList(
    writes,
    chain,
    token,
    price,
    decimals,
    symbol,
    timestamp,
    "vnxau-rwa",
    1,
  );

  return writes;
}
