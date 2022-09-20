import { batchGet } from "./shared/dynamodb";
import { coinToPK } from "./processCoin";

export type CoinsResponse = {
  [coin: string]: {
    decimals?: number,
    price: number,
    timestamp: number,
    symbol: string,
    confidence?: number,
  }
}

export const batchGetLatest = (pks:string[]) => batchGet(pks.map(pk => ({
  PK: pk,
  SK: 0,
})));

export async function getBasicCoins(requestedCoins:string[]){
  const PKTransforms = {} as {[pk:string]:string}
  const pks:string[] = []
  requestedCoins.forEach(coin=>{
    const pk = coinToPK(coin)
    PKTransforms[pk] = coin;
    pks.push(pk);
  })
  const coins = await batchGetLatest(pks)
  return {coins, PKTransforms}
}