import fetch from 'node-fetch'
import { wrapScheduledLambda } from "./utils/wrap";
import { getCoingeckoLock, setTimer } from './storeTvlUtils/coingeckoLocks'
import dynamodb from './utils/dynamodb';
import { decimals } from '@defillama/sdk/build/erc20'

interface Coin {
  id: string,
  symbol: string,
  name: string
}

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

interface StringObject {
  [id: string]: string | undefined
}
const platformMap = {
  'binance-smart-chain': 'bsc',
  'ethereum': 'ethereum',
  'polygon-pos': 'polygon',
  'avalanche': 'avax',
  'wanchain': 'wan',
  'fantom': 'fantom',
  'xdai': 'xdai',
  'okex-chain': 'okex',
  "huobi-token": 'heco'
} as StringObject

async function getAndStoreCoin(coin: Coin) {
  const coinData = await retryCoingeckoRequest(coin.id)
  if (coinData !== undefined) {
    const price = coinData.market_data?.current_price?.usd;
    if(typeof price !== 'number'){
      return
    }
    const platforms = coinData.platforms as StringObject;
    for (const platform in platforms) {
      if (platform !== "" && platforms[platform] !== "") {
        try {
          const chain = platformMap[platform.toLowerCase()];
          if (chain === undefined) {
            continue;
          }
          const tokenDecimals = await decimals(
            platforms[platform]!,
            chain as any
          )
          const address = chain + ':' + platforms[platform]!.toLowerCase().trim()
          const PK = `asset#${address}`
          const timestamp = Math.round(Date.now() / 1000)
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
        } catch (e) {
          console.error(coin, platform, e);
        }
      }
    }
  }
}

const step = 50;
const handler = async (event: any) => {
  const coins = event.coins as Coin[];
  const timer = setTimer();
  for (let i = 0; i < coins.length; i += step) {
    await Promise.all(coins.slice(i, i + step).map(getAndStoreCoin))
  }
  clearInterval(timer);
};

export default wrapScheduledLambda(handler);
