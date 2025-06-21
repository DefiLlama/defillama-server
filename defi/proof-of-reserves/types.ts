import { Balances } from "@defillama/sdk";

export type AssetBalance = Record<string, number>;

export interface AssetPoR {
  minted: Balances;
  reserves: Balances;
}

export interface GetPoROptions {
  timestamp: number;
}

export interface GetPoRResult {
  // chain => AssetPoR
  [key: string]: AssetPoR;
}

export interface IPoRAdapter {
  assetLabel: string;
  reserves: (options: GetPoROptions) => Promise<GetPoRResult>;
}
