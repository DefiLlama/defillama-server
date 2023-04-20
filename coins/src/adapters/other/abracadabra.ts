import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { call } from "@defillama/sdk/build/abi";
import { getTokenInfo } from "../utils/erc20";
import getBlock from "../utils/block";

const SPELLAddress: string = "0x090185f2135308bad17527004364ebcc2d37e5f6";
const sSPELLAddress: string = "0x26fa3fffb6efe8c1e69103acb4044c26b9a106a9";
const chain: any = "ethereum";

export default async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  let block: number | undefined = await getBlock(chain, timestamp);

  const [SPELLData, stakedBalance, sSPELLInfo] = await Promise.all([
    getTokenAndRedirectData([SPELLAddress], chain, timestamp),
    call({
      target: SPELLAddress,
      params: sSPELLAddress,
      chain,
      abi: "erc20:balanceOf",
      block
    }),
    getTokenInfo(chain, [sSPELLAddress], block, { withSupply: true, })
  ]);

  const SPELLPrice: number = SPELLData[0].price;
  const price: number =
    (SPELLPrice * stakedBalance.output) / sSPELLInfo.supplies[0].output;

  addToDBWritesList(
    writes,
    chain,
    sSPELLAddress,
    price,
    sSPELLInfo.decimals[0].output,
    sSPELLInfo.symbols[0].output,
    timestamp,
    "abracadabra",
    0.9
  );
  addToDBWritesList(
    writes,
    "fantom",
    "0xbb29d2a58d880af8aa5859e30470134deaf84f2b",
    undefined,
    18,
    sSPELLInfo.symbols[0].output,
    timestamp,
    "abracadabra",
    0.9,
    `asset#${chain}:${sSPELLAddress}`
  );

  return writes;
}
