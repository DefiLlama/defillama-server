export interface write {
  SK: number;
  PK: string;
  price: number | undefined;
  symbol: string;
  decimals: number;
  redirect: string | undefined;
}
export interface dbQuery {
  PK: string;
  SK: number;
}
export interface dbEntry {
  PK: string;
  SK: number;
  redirect: string;
  price: number;
  decimals: number;
  symbol: string;
}
export interface read {
  dbEntry: dbEntry;
  redirect: any;
}
export interface redirect {
  PK: string;
  SK: number;
  price: number;
}
export interface price {
  address: string;
  price: number;
}
