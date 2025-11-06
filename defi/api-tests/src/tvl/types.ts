export interface ChainTvl {
  [chain: number]: number;
  borrowed?: number;
}

export interface TokenTvl {
  [token: string]: number;
}

export interface ProtocolTvl {
  tvl: number;
  chainTvls?: ChainTvl;
  tokens?: TokenTvl;
  tokensInUsd?: TokenTvl;
}

export interface Protocol {
  id: string;
  name: string;
  address?: string | null;
  symbol: string;
  url?: string;
  description?: string;
  chain?: string;
  logo?: string;
  gecko_id?: string | null;
  cmcId?: string | null;
  category?: string;
  chains: string[];
  module?: string;
  twitter?: string;
  forkedFrom?: string[];
  oracles?: string[];
  listedAt?: number;
  slug: string;
  tvl: number | null;
  chainTvls: ChainTvl;
  change_1h?: number | null;
  change_1d?: number | null;
  change_7d?: number | null;
  tokenBreakdowns?: Record<string, TokenTvl>;
  mcap?: number | null;
  parentProtocolSlug?: string;
  staking?: number;
  dimensions?: any;
}

export interface HistoricalDataPoint {
  date: number;
  totalLiquidityUSD: number;
}

export interface ProtocolDetails extends Omit<Protocol, 'tvl' | 'chainTvls'> {
  otherProtocols?: string[];
  hallmarks?: Array<[number, string]>;
  currentChainTvls?: ChainTvl;
  chainTvls?: Record<string, any>;
  tokensInUsd?: any[];
  tokens?: any[];
  tvl?: HistoricalDataPoint[] | number;
  methodology?: string;
  misrepresentedTokens?: boolean;
  raises?: Array<{
    date?: string;
    round?: string;
    amount?: number;
  }>;
}

export interface ChartDataPoint {
  date: string | number;
  totalLiquidityUSD: number;
}

export interface HistoricalTvlPoint {
  date: number;
  tvl: number;
}

export interface Chain {
  gecko_id: string | null;
  tvl: number;
  tokenSymbol: string | null;
  cmcId: string | null;
  name: string;
  chainId?: number;
}

export function isProtocolArray(data: any): data is Protocol[] {
  return Array.isArray(data) && (data.length === 0 || ('name' in data[0] && 'tvl' in data[0]));
}

export function isProtocolDetails(data: any): data is ProtocolDetails {
  return data && typeof data === 'object' && 'name' in data && 'tvl' in data;
}

export function isChartData(data: any): data is ChartDataPoint[] {
  return Array.isArray(data) && (data.length === 0 || ('date' in data[0] && 'totalLiquidityUSD' in data[0]));
}
