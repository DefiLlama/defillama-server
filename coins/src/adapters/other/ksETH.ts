import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const ksETH: string = "0x513D27c94C0D81eeD9DC2a88b4531a69993187cF";
const ksETHRateProvider: string = "0x1A9fA10CA260387314185B9D7763164FD3D51226";
const underlying = '0x0000000000000000000000000000000000000000'
const chain: any = "ethereum";

export default async function getTokenPrice(timestamp: number) {
  const api = await getApi('ethereum', timestamp);
  const pricesObject: any = {};
  const writes: Write[] = [];
  const [
    ksETHToETHRate,
  ] = await Promise.all([
    api.call({ target: ksETHRateProvider, abi: 'uint256:getRate' }),
  ])
  pricesObject[ksETH] = { price: ksETHToETHRate / 1e18, underlying }

  await getWrites({ chain, timestamp, writes, pricesObject, projectName: "ksETH", })
  return writes;
}