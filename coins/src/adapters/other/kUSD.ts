import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const kUSD: string = "0x0bB9aB78aAF7179b7515e6753d89822b91e670C4";
const kUSDRateProvider: string = "0xde903b83dd8b11abbc28ab195d45fe60145c6e9b";
const underlying = '0x0000000000000000000000000000000000000000'
const chain: any = "ethereum";

export default async function getTokenPrice(timestamp: number) {
  const api = await getApi('ethereum', timestamp);
  const pricesObject: any = {};
  const writes: Write[] = [];
  const [
    kUSDToETHRate,
  ] = await Promise.all([
    api.call({ target: kUSDRateProvider, abi: 'uint256:kUSDPerToken' }),
  ])
  pricesObject[kUSD] = { price: kUSDToETHRate / 1e18, underlying }

  await getWrites({ chain, timestamp, writes, pricesObject, projectName: "kUSD", })
  return writes;
}