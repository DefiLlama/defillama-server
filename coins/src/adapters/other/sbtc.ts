import { getCurrentUnixTimestamp } from "../../utils/date";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const target = "0x094c0e36210634c3cfa25dc11b96b562e0b07624";
const chain = "ethereum";

export async function sbtc(timestamp: number = 0) {
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);

  const [deposits, supply] = await Promise.all([
    api.call({
      abi: "function getDepositAmounts() view returns (address[], uint256[])",
      target: "0x7dBAC0aA440A25D7FB43951f7b178FF7A809108D",
    }),
    api.call({
      abi: "erc20:totalSupply",
      target,
    }),
  ]);

  const prices = await getTokenAndRedirectDataMap(
    deposits[0],
    chain,
    timestamp,
  );

  let aum: number = 0;
  let aggConfidence: number = 1;
  deposits[0].map((asset: string, i: number) => {
    const normalisedAsset: string = asset.toLowerCase();
    if (!(normalisedAsset in prices))
      throw new Error(`price data missing for an underlying asset`);

    const { price, decimals, confidence } = prices[normalisedAsset];
    aum += (deposits[1][i] * price) / 10 ** decimals;
    aggConfidence = Math.min(aggConfidence, confidence ?? 1);
  });

  const writes: Write[] = [];
  const price: number = (aum * 10 ** 18) / supply;
  addToDBWritesList(
    writes,
    chain,
    target,
    price,
    18,
    "SBTC",
    timestamp,
    "SBTC",
    aggConfidence,
  );

  return writes;
}
