import { IJSON } from "./adaptors/data/types";
import { Protocol } from "./protocols/types";

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

export interface ICurrentChainTvls {
  [chain: string]: number;
}

export type ITokens = Array<{ date: number; tokens: { [token: string]: number } }> | null;

export interface IChainTvl {
  [chain: string]: {
    tvl: Array<{ date: number; totalLiquidityUSD: number }>;
    tokensInUsd?: ITokens;
    tokens?: ITokens;
  };
}

export interface ITvlsWithChangesByChain {
  [key: string]: {
    tvl: number | null;
    tvlPrevDay: number | null;
    tvlPrevWeek: number | null;
    tvlPrevMonth: number | null;
  };
}

export interface ITvlsByChain {
  [chain: string]: number;
}

export interface ProtocolTvls {
  tvl: number | null;
  tvlPrevDay: number | null;
  tvlPrevWeek: number | null;
  tvlPrevMonth: number | null;
  chainTvls: ITvlsWithChangesByChain;
}

export interface IRaise {
  date: number;
  name: string;
  amount: number;
  round: string;
  chains: Array<string>;
  sector: string;
  source: string;
  valuation: number;
  defillamaId?: number;
  leadInvestors: Array<string>;
  otherInvestors: Array<string>;
}

export interface IProtocolResponse extends Omit<Protocol, "symbol" | "chain" | "module"> {
  symbol?: string;
  chain?: string;
  module?: string;
  otherProtocols?: Array<string>;
  methodology?: string;
  misrepresentedTokens?: boolean;
  hallmarks?: [number, string][];
  chainTvls: IChainTvl;
  currentChainTvls: ICurrentChainTvls;
  tvl: { date: number; totalLiquidityUSD: number }[];
  tokensInUsd?: ITokens;
  tokens?: ITokens;
  isParentProtocol?: boolean;
  raises: Array<IRaise>;
  metrics?: IJSON<boolean>;
  mcap?: number | null;
  tokenPrice?: number | null;
  tokenMcap?: number | null;
  tokenSupply?: number | null;
}

export interface IProtocol
  extends Omit<IProtocolResponse, "tvl" | "currentChainTvls" | "chainTvls" | "symbol" | "module"> {
  symbol: string;
  module: string;
  slug: string;
  tvl: number;
  chain: string;
  chainTvls: ITvlsByChain;
  change_1h: number | null;
  change_1d: number | null;
  change_7d: number | null;
  mcap?: number;
  fdv?: number;
  staking?: number;
  pool2?: number;
  tokenBreakdowns: { [key: string]: number };
}

export type LiteProtocol = Pick<
  IProtocol,
  | "category"
  | "chains"
  | "oracles"
  | "forkedFrom"
  | "listedAt"
  | "mcap"
  | "name"
  | "symbol"
  | "logo"
  | "url"
  | "parentProtocol"
> &
  ProtocolTvls;

export interface IChain {
  gecko_id?: string | null;
  tokenSymbol?: string | null;
  cmcId?: string | null;
  chainId: number | null;
  tvl: number;
  name: string;
}
