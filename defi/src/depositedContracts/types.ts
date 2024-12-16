export type RawDeposits = {
  [from: string]: {
    timestamp: string;
    token: string;
    chain: number;
    value: number;
    transaction_hash: string;
  };
};
export type ReadableDeposit = {
  timestamp: string;
  symbol: string;
  chain: string;
  usdValue: string;
  url: string;
};
export type CoinData = {
  price: number;
  decimals: number;
  symbol: string;
};
