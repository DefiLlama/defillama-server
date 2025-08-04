import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const chain = "ethereum";
const address = "0x6c8550167bbd06d4610a6a443ecbed84bd1accd6";

export async function brkteth(timestamp: number = 0) {
  const api = await getApi(chain, timestamp);

  let count: number = 0;
  let collaterals: string[] = [];
  while (count < 20) {
    const res = await api.call({
      abi: "function collaterals(uint256) view returns (address collateral, bool whitelisted, uint256 totalDeposit)",
      target: address,
      params: count,
      permitFailure: true,
    });
    if (!res) break;

    collaterals.push(res.collateral);
    count++;
  }

  const [priceData, balances, supply] = await Promise.all([
    getTokenAndRedirectDataMap(collaterals, chain, timestamp),
    api.multiCall({
      calls: collaterals.map((collateral: string) => ({
        target: collateral,
        params: address,
      })),
      abi: "erc20:balanceOf",
    }),
    api.call({
      target: address,
      abi: "erc20:totalSupply",
    }),
  ]);

  let aum: number = 0;
  balances.map((balance, i) => {
    const asset = collaterals[i].toLowerCase();
    if (!(asset in priceData))
      throw new Error("Missing price data for underlying");
    const { price, decimals } = priceData[asset];
    const assetValue = (balance / 10 ** decimals) * price;
    aum += assetValue;
  });

  const writes: Write[] = [];
  addToDBWritesList(
    writes,
    chain,
    address,
    aum / (supply / 10 ** 18),
    18,
    "brktETH",
    timestamp,
    "brkteth",
    0.9,
  );

  return writes;
}
