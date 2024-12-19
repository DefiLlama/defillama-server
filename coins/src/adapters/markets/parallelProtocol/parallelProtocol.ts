import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { call } from "@defillama/sdk/build/abi";
import getBlock from "../../utils/block";

export const STABLES: Record<
  string,
  { symbol: string; address: string; feed?: string }[]
> = {
  ethereum: [
    {
      symbol: "PAR",
      address: "0x68037790a0229e9ce6eaa8a99ea92964106c4703",
      feed: "0xb49f677943BC038e9857d61E7d053CaA2C1734C1",
    },
    {
      symbol: "paUSD",
      address: "0x571f54D23cDf2211C83E9A0CbD92AcA36c48Fa02",
      feed: undefined,
    },
  ],
};

export async function getTokenPrices(chain: string, timestamp: number) {
  const stables = STABLES[chain] ?? [];
  const writes: Write[] = [];
  const block = await getBlock(chain, timestamp);

  for (let i = 0; i < stables.length; i++) {
    const { symbol, address, feed } = stables[i];
    const price = feed ? await getPrice(block, chain, feed) : 1;

    addToDBWritesList(
      writes,
      chain,
      address,
      price,
      18,
      symbol,
      timestamp,
      "parallel",
      1,
    );
  }
  return writes;
}

async function getPrice(
  block: number | undefined,
  chain: any,
  target: string,
): Promise<number> {
  const { output } = await call({ target, chain, block, abi });
  return output / 10 ** 8;
}

const abi = {
  name: "latestAnswer",
  outputs: [
    {
      internalType: "int256",
      name: "",
      type: "int256",
    },
  ],
  stateMutability: "view",
  type: "function",
};
