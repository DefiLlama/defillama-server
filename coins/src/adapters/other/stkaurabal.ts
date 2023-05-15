const abi = require("./abi.json");
import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../utils/block";
import { getTokenInfo } from "../utils/erc20";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";

const target: string = "0xfAA2eD111B4F580fCb85C48E6DC6782Dc5FCD7a6";
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
  const [
    { output: assets },
    { output: auraBal },
    tokenInfos,
  ] = await Promise.all([
    call({
      target,
      chain,
      abi: abi.totalAssets,
      block,
    }),
    call({
      target,
      chain,
      abi: abi.underlying,
      block,
    }),
    getTokenInfo(chain, [target], block, { withSupply: true }),
  ]);

  const underlyingData = await getTokenAndRedirectData(
    [auraBal],
    chain,
    timestamp,
  );

  const price =
    (assets * underlyingData[0].price) / tokenInfos.supplies[0].output;

  addToDBWritesList(
    writes,
    chain,
    target,
    price,
    tokenInfos.decimals[0].output,
    tokenInfos.symbols[0].output,
    timestamp,
    "stkaurabal",
    1,
  );
}
