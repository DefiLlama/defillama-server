import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../utils/block";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import abi from "./abi.json";
import { getTokenInfo } from "../utils/erc20";

const stETHvv: string = "0xbab1e772d70300422312dff12daddcb60864bd41";
const stETH: string = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";
const chain = "ethereum";

export default async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);

  const [
    { output: totalAssets },
    { output: totalSupply },
    stEthInfo,
    stEthVvInfo
  ] = await Promise.all([
    call({
      target: stETHvv,
      abi: abi.totalAssets,
      block,
      chain
    }),
    call({
      target: stETHvv,
      abi: "erc20:totalSupply",
      block,
      chain
    }),
    getTokenAndRedirectData([stETH], chain, timestamp),
    getTokenInfo(chain, [stETHvv], block)
  ]);
  const price: number =
    (parseInt(totalAssets) / totalSupply) * stEthInfo[0].price;

  addToDBWritesList(
    writes,
    chain,
    stETHvv,
    price,
    stEthVvInfo.decimals[0].output,
    stEthVvInfo.symbols[0].output,
    timestamp,
    "stETHvv",
    0.9
  );

  return writes;
}
