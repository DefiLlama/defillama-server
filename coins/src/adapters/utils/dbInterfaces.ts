export interface Write {
  SK: number;
  PK: string;
  price?: number;
  symbol: string;
  decimals: number;
  redirect?: string;
  adapter?: string;
  confidence: number;
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
