import { TokenConfig } from '../types';

export async function getCoinPrices(tokens: Array<TokenConfig>): Promise<Record<string, number>> {
  const coinPrices: Record<string, number> = {};

  let url = `https://coins.llama.fi/prices/current/`;
  for (const token of tokens) {
    url += `${token.chain}:${token.address},`;
  }
  const response = await fetch(url);
  const coins = (await response.json()).coins;
  for (const [key, values] of Object.entries(coins)) {
    if (values && (values as any).price) {
      coinPrices[key] = Number((values as any).price);
    }
  }

  return coinPrices;
}

export async function getLlamaTvl(protocolId: string): Promise<number> {
  const response = await fetch(`https://api.llama.fi/tvl/${protocolId}`);
  const tvl = await response.text();
  return tvl ? Number(tvl) : 0;
}

export async function getBTCPriceUSD(): Promise<number> {
  const coinPrices = await getCoinPrices([{chain: 'ethereum', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'}]);
  return Number(coinPrices['ethereum:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599']);
}
