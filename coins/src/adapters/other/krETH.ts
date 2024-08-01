import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const krETH: string = "0xf02C96DbbB92DC0325AD52B3f9F2b951f972bf00";
const krETHRateProvider: string = "0x8fDDab48DD17dDCeD87730020F4213528042dba3";
const underlying = '0x0000000000000000000000000000000000000000'
const chain: any = "ethereum";

export default async function getTokenPrice(timestamp: number) {
  const api = await getApi('ethereum', timestamp);
  const pricesObject: any = {};
  const writes: Write[] = [];
  const [
    krETHToETHRate,
  ] = await Promise.all([
    api.call({ target: krETHRateProvider, abi: 'uint256:getRate' }),
  ])
  pricesObject[krETH] = { price: krETHToETHRate / 1e18, underlying }

  await getWrites({ chain, timestamp, writes, pricesObject, projectName: "krETH", })
  return writes;
}