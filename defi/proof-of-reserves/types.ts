export interface TokenConfig {
  chain: string;
  address: string;
  decimals?: number;
  llamaCoinPriceId?: string;
}

export interface GetPoROptions {}

export interface IPoRAdapter {
  protocolId: string;
  whitelised?: boolean;
  minted: (options: GetPoROptions) => Promise<number>;
  reserves: () => Promise<number>;
}
