import fetch from "node-fetch";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { getCoingeckoLock, setTimer } from "./utils/shared/coingeckoLocks";
import dynamodb from "./utils/shared/dynamodb";
import { decimals } from "@defillama/sdk/build/erc20";
import invokeLambda from "./utils/shared/invokeLambda";
import sleep from "./utils/shared/sleep";
import { Coin, iterateOverPlatforms } from "./utils/coingeckoPlatforms";

const retries = 3;
async function retryCoingeckoRequest(id: string) {
  for (let i = 0; i < retries; i++) {
    await getCoingeckoLock();
    try {
      const coinData = await fetch(
        `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
      ).then((r) => r.json());
      return coinData;
    } catch (e) {
      continue;
    }
  }
  return undefined;
}

async function getAndStoreCoin(coin: Coin, rejected: Coin[]) {
  const coinData = await retryCoingeckoRequest(coin.id);
  if(coin.id === "decentraweb"){
    return
  }
  const price = coinData?.market_data?.current_price?.usd;
  const mcap = coinData?.market_data?.market_cap?.usd;
  const fdv = coinData?.market_data?.fully_diluted_valuation?.usd;
  const symbol = coinData?.symbol ?? coin.symbol;
  if (typeof price !== "number") {
    console.error(`Couldn't get data for ${coin.id}`);
    rejected.push(coin);
    return;
  }
  const timestamp = Math.round(Date.now() / 1000);
  await iterateOverPlatforms(
    coinData,
    coin,
    async (PK, tokenAddress, chain) => {
      const tokenDecimals = await decimals(tokenAddress, chain as any);
      await dynamodb.put({
        PK,
        SK: 0,
        timestamp,
        price,
        symbol,
        decimals: Number(tokenDecimals.output),
      });
      await dynamodb.put({
        PK,
        SK: timestamp,
        price,
      });
    }
  );
  const coingeckoItem = {
    PK: `asset#${coin.id}`,
    price,
    mcap,
    fdv
  }
  await dynamodb.put({
    ...coingeckoItem,
    SK: 0,
    timestamp,
    symbol
  });
  await dynamodb.put({
    ...coingeckoItem,
    SK: timestamp
  });
  try{
    const logo = coinData?.image?.thumb;
    const logoKeys = {
      PK: `cgLogo#${coin.id}`,
      SK:0
    }
    const logoData = await dynamodb.get(logoKeys)
    if(logoData.Item === undefined){
      await dynamodb.put({
        ...logoKeys,
        thumb: logo
      });
    }
  } catch(e){}
}

const step = 50;
const handler = async (event: any, context: AWSLambda.Context) => {
  const coins = event.coins as Coin[];
  const depth = event.depth as number;
  const rejected = [] as Coin[];
  const timer = setTimer();
  for (let i = 0; i < coins.length; i += step) {
    await Promise.all(
      coins.slice(i, i + step).map((coin) => getAndStoreCoin(coin, rejected))
    );
  }
  clearInterval(timer);
  if (rejected.length > 0) {
    if (depth >= 2) {
      console.error("Unprocessed coins", rejected);
      return;
    } else {
      await sleep(Math.max(context.getRemainingTimeInMillis() - 10e3, 0)); // Wait until there's 10 seconds left
      await invokeLambda(`defillama-prod-fetchCoingeckoData`, {
        coins: rejected,
        depth: depth + 1,
      });
    }
  }
};

export default wrapScheduledLambda(handler);
