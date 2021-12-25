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
