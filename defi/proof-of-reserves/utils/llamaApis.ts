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

let allProtocols: any = null;
export async function getLlamaTvl(protocolId: string): Promise<number> {
  if (allProtocols === null) {
    const response = await fetch('https://api.llama.fi/protocols');
    allProtocols = await response.json();
  }

  for (const protocolData of allProtocols) {
    if (protocolData.slug === protocolId) {
      return Number(protocolData.tvl);
    }
  }

  return 0;
}

let btcPriceUsd: null | number = null;
export async function getBTCPriceUSD(): Promise<number> {
  if (btcPriceUsd === null) {
    const coinPrices = await getCoinPrices([{chain: 'ethereum', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'}]);
    btcPriceUsd = Number(coinPrices['ethereum:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599']);
  }
  return btcPriceUsd;
}
