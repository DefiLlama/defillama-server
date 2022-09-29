import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../utils/block";
import { getBalance } from "@defillama/sdk/build/eth/index";
import { wrappedGasTokens } from "../utils/gasTokens";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";

const uniPool: string = "0x09cabec1ead1c0ba254b09efb3ee13841712be14";
const saiAddress: string = "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359";
const chain: string = "ethereum";

export default async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);

  const [ethBalance, saiBalance, ethInfo] = await Promise.all([
    getBalance({
      target: uniPool,
      block
    }),
    call({
      target: saiAddress,
      params: uniPool,
      abi: "erc20:balanceOf",
      block
    }),
    getTokenAndRedirectData([wrappedGasTokens[chain]], chain, timestamp)
  ]);
  const saiPrice: number =
    (parseInt(ethBalance.output) / saiBalance.output) * ethInfo[0].price;

  addToDBWritesList(
    writes,
    chain,
    saiAddress,
    saiPrice,
    18,
    "SAI",
    timestamp,
    "sai",
    0.5
  );

  return writes;
}
