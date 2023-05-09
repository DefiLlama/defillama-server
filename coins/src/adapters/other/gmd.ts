const abi = require("./abi.json");
import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../utils/block";
import { getTokenInfo } from "../utils/erc20";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";

const vault: string = "0x8080B5cE6dfb49a6B86370d6982B3e2A86FBBb08";
const chain: any = "arbitrum";
const usdc: string = "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8";
const token: string = "0xEC13336bbd50790a00CDc0fEddF11287eaF92529";

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
    getTokenInfo(chain, [token], block),
    getTokenAndRedirectData([usdc], chain, timestamp),
  ]);

  const price =
    (rate * underlyingData[0].price) / 10 ** tokenInfos.decimals[0].output;

  addToDBWritesList(
    writes,
    chain,
    token,
    price,
    tokenInfos.decimals[0].output,
    tokenInfos.symbols[0].output,
    timestamp,
    "gmd",
    1,
  );
}
