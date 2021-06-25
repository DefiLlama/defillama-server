export interface TokenPrices {
  [token: string]: {
    usd: number;
  };
}

export type TokensValueLocked = {
  [tokenSymbolOrName: string]: number;
};

export type tvlsObject<T> = {
  [chain: string]: T;
};

const chains = [
  'Ethereum',
  'Binance',
  'Polygon',
  'Avalanche',
  'Terra',
  'xDai',
  'Solana',
  'Fantom',
  'Heco',
  'OKExChain',
  'Wanchain',
  'Harmony'
] as const;

export type chains = typeof chains[number];
