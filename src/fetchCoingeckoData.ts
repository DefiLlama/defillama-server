import fetch from 'node-fetch'
import { wrapScheduledLambda } from "./utils/wrap";
import { getCoingeckoLock, setTimer } from './storeTvlUtils/coingeckoLocks'
import dynamodb from './utils/dynamodb';
import { decimals } from '@defillama/sdk/build/erc20'
import invokeLambda from './utils/invokeLambda'
import sleep from './utils/sleep'
import {Coin, iterateOverPlatforms} from './utils/coingeckoPlatforms'



const retries = 3;
async function retryCoingeckoRequest(id: string) {
  for (let i = 0; i < retries; i++) {
    await getCoingeckoLock();
    try {
      const coinData = await fetch(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`).then(r => r.json());
      return coinData
    } catch (e) {
      continue;
    }
  }
  return undefined
}

async function getAndStoreCoin(coin: Coin, rejected: Coin[]) {
  const coinData = await retryCoingeckoRequest(coin.id)
  const price = coinData?.market_data?.current_price?.usd;
  if (typeof price !== 'number') {
    console.error(`Couldn't get data for ${coin.id}`)
    rejected.push(coin)
    return
  }
  const timestamp = Math.round(Date.now() / 1000);
  await iterateOverPlatforms(coinData, coin, async (PK, tokenAddress, chain)=>{
    const tokenDecimals = await decimals(
      tokenAddress,
      chain as any
    )
    await dynamodb.put({
      PK,
      SK: 0,
      timestamp,
      price,
      symbol: coinData.symbol ?? coin.symbol,
      decimals: Number(tokenDecimals.output)
    })
    await dynamodb.put({
      PK,
      SK: timestamp,
      price
    })
  })
}

const step = 50;
const handler = async (event: any, context:AWSLambda.Context) => {
  const coins = event.coins as Coin[];
  const depth = event.depth as number;
  const rejected = [] as Coin[];
  const timer = setTimer();
  for (let i = 0; i < coins.length; i += step) {
    await Promise.all(coins.slice(i, i + step).map(coin => getAndStoreCoin(coin, rejected)))
  }
  clearInterval(timer);
  if (rejected.length > 0) {
    if (depth >= 2) {
      console.error(rejected)
      throw new Error("Unprocessed coins")
    } else {
      await sleep(Math.max(context.getRemainingTimeInMillis()-10e3, 0)) // Wait until there's 10 seconds left
      await invokeLambda(`defillama-prod-fetchCoingeckoData`, {
        coins: rejected,
        depth: depth + 1
      })
    }
  }
};

export default wrapScheduledLambda(handler);
