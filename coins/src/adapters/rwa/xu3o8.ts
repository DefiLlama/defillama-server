import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import { getApi } from "../utils/sdk";

const token = "0x79052Ab3C166D4899a1e0DD033aC3b379AF0B1fD";
const poolContract = "0xB387D0A73619791420De4a1e5e710023Cb0f49c0";
const chain = "etlk";

export function xu3o8(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const api = await getApi(chain, timestamp, true);

  const [decimals, symbol] = await Promise.all([
    api.call({ abi: "uint8:decimals", target: token }),
    api.call({ abi: "string:symbol", target: token }),
  ]);

  const price = await getXU3o8Price(poolContract, timestamp, decimals);

  addToDBWritesList(
    writes,
    chain,
    token,
    price / 10 ** (decimals - 6),
    decimals,
    symbol,
    timestamp,
    "xu3o8-rwa",
    1,
  );

  return writes;
}

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

async function getXU3o8Price(
  poolContract: string,
  timestamp: number,
  decimals: number,
) {
  const api = await getApi(chain, timestamp, true);

  const slot0Data = await api.call({
    abi: slot0Abi,
    target: poolContract,
  });

  const sqrtPriceX96 = slot0Data[0]; // First return value is sqrtPriceX96
  const xu3o8Price = convertSqrtPriceX96ToXU3O8Price(sqrtPriceX96, decimals);

  return xu3o8Price;
}

function convertSqrtPriceX96ToXU3O8Price(
  sqrtPriceX96: number,
  decimals: number,
) {
  const buyOneOfToken0 = (sqrtPriceX96 / 2 ** 96) * 2;
  return buyOneOfToken0 * 10 ** decimals;
}
