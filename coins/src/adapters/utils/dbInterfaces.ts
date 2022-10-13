export interface Write {
  SK: number;
  PK: string;
  price?: number;
  symbol?: string;
  decimals?: number;
  redirect?: string;
  adapter?: string;
  confidence: number;
  timestamp?: number;
}
export interface DbQuery {
  PK: string;
  SK: number;
}
export interface DbEntry {
  PK: string;
  SK: number;
  redirect: string;
  price: number;
  decimals: number;
  symbol: string;
  confidence: number;
}
export interface Read {
  dbEntry: DbEntry;
  redirect: any;
}
export interface Redirect {
  PK: string;
  SK: number;
  price: number;
}
export interface Price {
  address: string;
  price: number;
}
export interface CoinData {
  chain: string | undefined;
  address: string;
  decimals: number;
  symbol: string;
  price: number;
  timestamp: number;
  redirect: string | undefined;
  confidence: number | undefined;
}
