import fetch from 'node-fetch'
import { wrapScheduledLambda } from "./utils/wrap";
import { getCoingeckoLock, setTimer } from './storeTvlUtils/coingeckoLocks'
import dynamodb from './utils/dynamodb';

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
      const coinData= await fetch(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`).then(r=>r.json());
      return coinData
    } catch (e) {
      continue;
    }
  }
  return undefined
}

const platformMap = {
  'binance-smart-chain': 'bsc',
  'ethereum': 'ethereum',
  'polygon-pos': 'polygon',
  'avalanche': 'avax',
  'wanchain': 'wan',
  'fantom': 'fantom',
  'xdai': 'xdai',
  'okex-chain':'okex',
  "huobi-token": 'heco'
} as {
  [id:string]:string|undefined
}

async function getAndStoreCoin(coin: Coin) {
  const coinData = await retryCoingeckoRequest(coin.id)
  if(coinData !== undefined){
    const price = coinData.market_data.current_price.usd;
    const platforms = coinData.platforms;
    for(const platform in platforms){
      if(platform !== ""){
        const prefix = platformMap[platform.toLowerCase()] ?? platform.toLowerCase();
        const address = prefix + ':' + platforms[platform]
        const PK = `asset#${address}`
        const timestamp = Math.round(Date.now()/1000)
        const item = {
          PK,
          timestamp,
          price
        }
        await dynamodb.put({
          ...item,
          SK: 0,
        })
        await dynamodb.put({
          ...item,
          SK: timestamp,
        })
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
