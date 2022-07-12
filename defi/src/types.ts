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

interface ICurrentChainTvls {
  [chain: string]: number;
}

interface IChainTvl {
  [type: string]: {
    tvl: { date: number; totalLiquidityUSD: number }[];
    tokensInUsd?: Array<{ date: number; tokens: { [token: string]: number } }>;
    tokens?: Array<{ date: number; tokens: { [token: string]: number } }>;
  };
}

interface ItvlsWithChangesByChain {
  [key: string]: {
    tvl: number | null;
    tvlPrevDay: number | null;
    tvlPrevWeek: number | null;
    tvlPrevMonth: number | null;
  };
};

export interface ITvlsByChain {
  [chain: string]: number;
}


export interface ProtocolTvls {
  tvl: number | null;
  tvlPrevDay: number | null;
  tvlPrevWeek: number | null;
  tvlPrevMonth: number | null;
  chainTvls: ItvlsWithChangesByChain;
};

export interface IProtocolResponse extends Protocol {
  otherProtocols?: Array<string>;
  methodology?: string;
  misrepresentedTokens?: boolean;
  hallmarks?: [number, string];
  chainTvls: IChainTvl;
  currentChainTvls: ICurrentChainTvls;
  tvl: { date: number; totalLiquidityUSD: number }[];
  tokensInUsd?: Array<{ date: number; tokens: { string: number } }>;
  tokens?: Array<{ date: number; tokens: { string: number } }>;
}


export interface IProtocol
  extends Omit<IProtocolResponse, "tvl" | "currentChainTvls" | "chainTvls"> {
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
    | "parentProtocol"
  > & ProtocolTvls

export interface IChain {
  gecko_id?: string | null;
  tokenSymbol?: string | null;
  cmcId?: string | null;
  chainId: number | null;
  tvl: number;
  name: string;
}
