import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const swETH: string = "0xf951E335afb289353dc249e82926178EaC7DEd78";
const underlying = '0x0000000000000000000000000000000000000000'
const chain: any = "ethereum";

export default async function getTokenPrice(timestamp: number) {
  const api = await getApi('ethereum', timestamp);
  const pricesObject: any = {};
  const writes: Write[] = [];
  const [
    swETHToETHRate,
    eETHPrice,
    svETHPrice,
  ] = await Promise.all([
    api.call({ target: swETH, abi: 'uint256:swETHToETHRate' }),
    api.call({ target: '0xb09cbB6Aa95A004F9aeE4349DF431aF5ad03ECe4', abi: 'uint256:answer' }),
    api.call({ target: '0xaF33b6372354149c33893B6fA6959Be0607D53dE', abi: 'uint256:getVectorSharePrice' }),
  ])
  pricesObject[swETH] = { price: swETHToETHRate / 1e18, underlying }
  pricesObject['0xeA1A6307D9b18F8d1cbf1c3Dd6aad8416C06a221'] = { price: eETHPrice / 1e18, underlying }
  pricesObject['0x6733f0283711f225a447e759d859a70b0c0fd2bc'] = { price: svETHPrice / 1e18, underlying }

  await getWrites({ chain, timestamp, writes, pricesObject, projectName: "swETH", })
  return writes;
}
