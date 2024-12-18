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
    },
  ],
};

export async function getTokenPrices(chain: string, timestamp: number) {
  const stables = STABLES[chain] ?? [];
  const writes: Write[] = [];

  for (let i = 0; i < stables.length; i++) {
    const { symbol, address, feed } = stables[i];
    let price = 1;
    if (feed) {
      price = await getPrice(timestamp, chain, feed);
    }
    addToDBWritesList(
      writes,
      chain,
      address,
      price,
      18,
      symbol,
      timestamp,
      "parallel",
      1
    );
  }
  return writes;
}

async function getPrice(
  timestamp: number,
  chain: any,
  feed: string
): Promise<number> {
  const block = await getBlock(chain, timestamp);
  const { answer } = await call({
    target: feed,
    chain,
    block,
    abi: CHAINLINK_FEED_ABI,
  });
  return answer / 10 ** 8;
}

const CHAINLINK_FEED_ABI = {
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
