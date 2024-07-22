const abi = require("./abi.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import getBlock from "../../utils/block";
import { Result } from "../../utils/sdkInterfaces";
import { getTokenInfo } from "../../utils/erc20";
import { Write, CoinData } from "../../utils/dbInterfaces";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";

const chain: any = "ethereum";

const tokenList = [
  "0x085780639CC2cACd35E474e71f4d000e2405d8f6",
  "0x65D72AA8DA931F047169112fcf34f52DbaAE7D18",
  "0x9D11ab23d33aD026C466CE3c124928fDb69Ba20E",
  "0x9f0D5E33617A1Db6f1CBd5580834422684f09269",
];
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
    const price = nav;
    addToDBWritesList(
      writes,
      chain,
      tokenAddress,
      price,
      tokenInfos.decimals[0].output,
      tokenInfos.symbols[0].output,
      timestamp,
      "fx-protocol",
      1,
      `asset#${chain}:${tokenAddress}`
    );
  });

  return writes;
}
