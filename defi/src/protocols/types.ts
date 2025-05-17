export interface Protocol {
  id: string;
  name: string;
  address?: string | null;
  symbol: string;
  assetToken?: string;
  url: string;
  description: string | null;
  chain: string;
  logo: string | null;
  audits?: string | null;
  audit_note?: string | null;
  gecko_id: string | null;
  cmcId: string | null;
  category?: string;
  chains: Array<string>;
  oracles?: Array<string>;
  forkedFrom?: Array<string>;
  forkedFromIds?: Array<string>;
  module: string;
  twitter?: string | null;
  language?: string;
  audit_links?: Array<string>;
  listedAt?: number;
  openSource?: boolean;
  parentProtocol?: string;
  treasury?: string | null;
  referralUrl?: string;
  oraclesByChain?: {
    [chain: string]: string[];
  };
  governanceID?: Array<string>;
  github?: Array<string>;
  stablecoins?: string[];
  wrongLiquidity?: boolean;
  rugged?: boolean;
  deadUrl?: boolean;
  deadFrom?: number | string;
  tokensExcludedFromParent?: {
    [chain:string]: string[];
  },
  note?: string;
  previousNames?: string[];
  deprecated?: boolean;
  oraclesBreakdown?: Array<{
    name: string,
    type: "Primary" // Oracle that secures more than 50% of protocol TVL, if oracle is hacked >50% of TVL will be lost
      | "Secondary" // Oracle that is actively used but secures less than 50% of TVL
      | "Fallback" // Oracle that isn't actively used and is just there in case the primary or secondary oracles fail
      | "RNG" // Oracle just used to provide random values (eg for games), it doesn't secure any TVL
      | "Aggregator", // Oracle used in conjuction with other oracles (eg by taking the median of multiple oracles), and thus a failure of it doesn't imply direct losses
      // pls add more as needed
    proof: Array<string>,
    startDate?: string, // YYYY-MM-DD
    endDate?: string,
    chains?: Array<{
      chain: string,
      startDate?: string,
      endDate?: string
    }>
  }>
}

export interface IParentProtocol {
  id: string;
  name: string;
  url: string;
  referralUrl?: string;
  description: string;
  logo: string;
  chains: Array<string>;
  symbol?: string | null;
  gecko_id: string | null;
  cmcId: string | null;
  categories?: Array<string>;
  twitter: string | null;
  oracles?: Array<string>;
  forkedFrom?: Array<string>;
  forkedFromIds?: Array<string>;
  governanceID?: Array<string>;
  github?: Array<string>;
  treasury?: string | null;
  stablecoins?: string[];
  wrongLiquidity?: boolean;
  address?: string | null;
}
