import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { formatUnits } from "ethers";
import { addToDBWritesList } from "../utils/database";


const priceFeedManager: string = "0x428cfa65310c70bc9e65bddb26c65fe4ca490376";

const pools: { [id: string]: string } = {
  "19": "0x103222f020e98Bba0AD9809A011FDF8e6F067496", //earnAUSD
  "13": "0x0c65A0BC65a5D819235B71F554D210D3F80E0852", //aprMON
  "12": "0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081", //gMON
};


export default async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  const writes: Write[] = [];

  const [prices, decimals, symbols] = await Promise.all([
    api.multiCall({
      calls: Object.keys(pools).map((poolId) => ({
        target: priceFeedManager,
        params: poolId,
      })),
      abi: "function processPriceFeed(uint8 poolId) view returns (uint256 price, uint8 decimals)",
    }),
    api.multiCall({
      calls: Object.values(pools).map((token) => ({
        target: token,
      })),
      abi: "erc20:decimals",
    }),
    api.multiCall({
      calls: Object.values(pools).map((token) => ({
        target: token,
      })),
      abi: "erc20:symbol",
    }),
  ]);

  Object.values(pools).map((token, i) =>
    addToDBWritesList(
      writes,
      chain,
      token,
      prices[i].price / 10 ** prices[1].decimals ,
      decimals[i],
      symbols[i],
      timestamp,
      "townsquare",
      0.9,
    ),
  );

  return writes;
}