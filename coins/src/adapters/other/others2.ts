
import getWrites from "../utils/getWrites";
import { getTokenSupplies, getTokenAccountBalances, } from "../solana/utils";


async function solanaAVS(timestamp: number = 0) {
  const chain = "solana";
  const tokens = [
    { mint: 'sonickAJFiVLcYXx25X9vpF293udaWqDMUCiGtk7dg2', underlying: 'sSo14endRuUbvQaJS3dq36Q829a3A6BEfoeeRGJywEh', tokenAccount: 'Bc7hj6aFhBRihZ8dYp8qXWbuDBXYMya4dzFGmHezLnB7', symbol: 'sonicsSOL', decimals: 9, },
  ]
  const supplies = await getTokenSupplies(tokens.map(i => i.mint))
  const balances = await getTokenAccountBalances(tokens.map(i => i.tokenAccount), { individual: true, })
  const pricesObject: any = {}
  tokens.forEach((token, i) => {
    const price = balances[i].amount / supplies[i].amount
    pricesObject[token.mint] = {
      underlying: token.underlying,
      price,
      symbol: token.symbol,
      decimals: token.decimals,
    }
  })
  return getWrites({ chain, timestamp, pricesObject, projectName: "solanaAVS", });
}

export const adapters = {
  solanaAVS,
};
