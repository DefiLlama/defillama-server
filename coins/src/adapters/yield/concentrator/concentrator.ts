const abi = require("./abi.json");
import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../../utils/block";
import { getTokenInfo } from "../../utils/erc20";
import { Write } from "../../utils/dbInterfaces";
import { addToDBWritesList } from "../../utils/database";

const tokenList = ["0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39"];
async function getPoolInfos(
  block: number | undefined,
  chain: any,
  target: string
) {
  const [{ output: nav }, tokenInfos] = await Promise.all([
    call({
      target,
      chain,
      abi: abi.nav,
      params: [],
      block,
    }),
    getTokenInfo(chain, [target], block),
  ]);
  return { nav, tokenAddress: target, tokenInfos };
}
export default async function getTokenPrices(timestamp: number, chain: string) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const datas = await Promise.all(
    tokenList.map((token) => {
      return getPoolInfos(block, chain, token);
    })
  );
  const writes: Write[] = [];
  datas.map(({ nav, tokenAddress, tokenInfos }) => {
    const price = nav / 10 ** tokenInfos.decimals[0].output;
    addToDBWritesList(
      writes,
      chain,
      tokenAddress,
      price,
      tokenInfos.decimals[0].output,
      tokenInfos.symbols[0].output,
      timestamp,
      "concentrator",
      1
    );
  });
  return writes;
}
