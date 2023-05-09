const abi = require("./abi.json");
import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../utils/block";
import { getTokenInfo } from "../utils/erc20";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { wrappedGasTokens } from "../utils/gasTokens";

const target: string = "0xf951E335afb289353dc249e82926178EaC7DEd78";
const chain: any = "ethereum";

export default async function getTokenPrice(timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const writes: Write[] = [];
  await contractCalls(target, block, writes, timestamp);
  return writes;
}

async function contractCalls(
  target: string,
  block: number | undefined,
  writes: Write[],
  timestamp: number,
) {
  const [{ output: rate }, underlyingData, tokenInfos] = await Promise.all([
    call({
      target,
      chain,
      abi: abi.swETHToETHRate,
      block,
    }),
    getTokenAndRedirectData([wrappedGasTokens[chain]], chain, timestamp),
    getTokenInfo(chain, [target], block),
  ]);

  const price =
    (rate * underlyingData[0].price) / 10 ** tokenInfos.decimals[0].output;

  addToDBWritesList(
    writes,
    chain,
    target,
    price,
    tokenInfos.decimals[0].output,
    tokenInfos.symbols[0].output,
    timestamp,
    "sweth",
    1,
  );
}
