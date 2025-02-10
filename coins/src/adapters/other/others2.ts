
import getWrites from "../utils/getWrites";
import { getTokenSupplies, getTokenAccountBalances, } from "../solana/utils";
import { getApi } from "../utils/sdk";
import { nullAddress } from "../../utils/shared/constants";


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


async function wstBFC(timestamp: number = 0) {
  const chain = "bfc";
  const api = await getApi(chain, timestamp);
  const pricesObject: any = {};
  const wstBFC = "0x386f2F5d9A97659C86f3cA9B8B11fc3F76eFDdaE";
  const bal = await api.call({ abi: "erc20:balanceOf", target: '0xEff8378C6419b50C9D87f749f6852d96D4Cc5aE4', params: wstBFC, });
  const supply = await api.call({ abi: "erc20:totalSupply", target: wstBFC });
  pricesObject[wstBFC] = { price: bal / supply, underlying: nullAddress };
  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "other2",
  });
}


export const adapters = {
  solanaAVS,
  wstBFC,
};
