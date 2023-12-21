const abi = require("./abi.json");
import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../utils/block";
import { getTokenInfo } from "../utils/erc20";
import { CoinData, Write } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";

const vault: string = "0x8080B5cE6dfb49a6B86370d6982B3e2A86FBBb08";
const chain: any = "arbitrum";

const underlyings: any = [
  "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
  "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
];
const tokens: any = [
  "0x3DB4B7DA67dd5aF61Cb9b3C70501B1BdB24b2C22",
  "0x34101Fe647ba02238256b5C5A58AeAa2e532A049",
  "0x1E95A37Be8A17328fbf4b25b9ce3cE81e271BeB3",
  "0x147FF11D9B9Ae284c271B2fAaE7068f4CA9BB619",
];

export default async function getTokenPrice(timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const writes: Write[] = [];
  await contractCalls(block, writes, timestamp);
  return writes;
}

async function contractCalls(
  block: number | undefined,
  writes: Write[],
  timestamp: number,
) {
  const [{ output: rate }, tokenInfos, underlyingData] = await Promise.all([
    call({
      target: vault,
      chain,
      abi: abi.GDpriceToStakedToken,
      params: [0],
      block,
    }),
    getTokenInfo(chain, tokens, block),
    getTokenAndRedirectData(underlyings, chain, timestamp),
  ]);
  for (let i = 0; i < tokens.length; i++) {
    const underlying: CoinData | undefined = underlyingData.find(
      (u: CoinData) => u.address == underlyings[i].toLowerCase(),
    );
    if (!underlying) continue;
    const price: number = (rate * underlying.price) / 10 ** 18;

    addToDBWritesList(
      writes,
      chain,
      tokens[i],
      price,
      tokenInfos.decimals[i].output,
      tokenInfos.symbols[i].output,
      timestamp,
      "gmd",
      1,
    );
  }
}
