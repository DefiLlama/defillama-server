import { TokenConfig } from '../types';

export async function getCoinPrices(tokens: Array<TokenConfig>): Promise<Record<string, number>> {
  const coinPrices: Record<string, number> = {};

  let url = `https://coins.llama.fi/prices/current/`;
  for (const token of tokens) {
    if (token.llamaCoinPriceId) {
      url += `${token.llamaCoinPriceId},`;
    } else {
      url += `${token.chain}:${token.address},`;
    }
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

let _protocolTvlMap: any

async function getProtocolTvlMap(): Promise<Record<string, number>> {
  if (!_protocolTvlMap) {
    _protocolTvlMap = fetch('https://api.llama.fi/protocols')
      .then(response => response.json())
      .then(data => {
        let slugMap: Record<string, number> = {};
        for (const protocol of data) {
          if (protocol.slug && protocol.tvl) {
            slugMap[protocol.slug] = Number(protocol.tvl);
          }
        }
        return slugMap;
      })
  }
  return _protocolTvlMap;
}

export async function getLlamaTvl(protocolId: string): Promise<number> {
  const protocolTvlMap = await getProtocolTvlMap()
  return protocolTvlMap[protocolId] ?? 0
}

let _btcPriceUsd: any

export async function getBTCPriceUSD(): Promise<number> {
  if (!_btcPriceUsd) _btcPriceUsd = _getBTCPriceUSD()
  return _btcPriceUsd;
}

async function _getBTCPriceUSD(): Promise<number> {
    const coinPrices = await getCoinPrices([{chain: 'ethereum', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'}]);
  return Number(coinPrices['ethereum:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599']);
}
