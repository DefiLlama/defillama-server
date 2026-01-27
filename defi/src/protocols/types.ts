import { DimensionsConfig } from "../adaptors/data/types";

type DateString = string | number;
export type Hallmark = [DateString, string] | [[DateString, DateString], string];

// --------------------
// Governance/value-accrual types (NEW)
// --------------------

export type TokenRightLabel = "Governance" | "Treasury" | "Revenue";

export interface TokenRight {
  label: TokenRightLabel | string; // extensible
  hasRight: boolean;
  details?: string;
}

export type GovernanceRights = "NONE" | "LIMITED" | "FULL";
export type FeeSwitchStatus = "ON" | "OFF" | "PENDING" | "UNKNOWN";

export interface GovernanceLink {
  label: string;
  url: string;
}

export interface GovernanceData {
  rights: GovernanceRights;
  details?: string;
  feeSwitchStatus?: FeeSwitchStatus;
  feeSwitchDetails?: string;
  links?: GovernanceLink[];
}

export type BuybacksStatus = "ACTIVE" | "INACTIVE" | "NONE" | "UNKNOWN";
export type DividendsStatus = "ACTIVE" | "INACTIVE" | "NONE" | "UNKNOWN";
export type BurnsStatus = "ACTIVE" | "INACTIVE" | "NONE" | "UNKNOWN";

export interface HoldersRevenueAndValueAccrual {
  buybacks?: BuybacksStatus;
  dividends?: DividendsStatus;
  burns?: BurnsStatus;
  burnSources?: string[];
  primaryValueAccrual?: string;
}

export type FundraisingType = "EQUITY" | "TOKEN" | "NONE" | "UNKNOWN";
export type EquityRevenueCaptureStatus = "ACTIVE" | "INACTIVE" | "PARTIAL" | "UNKNOWN";


export interface TokenAlignmentLink {
  label: string;
  url: string;
}

export interface TokenAlignment {
  fundraising?: FundraisingType;
  raiseDetailsLink?: TokenAlignmentLink;
  associatedEntities?: string[];
  equityRevenueCapture?: EquityRevenueCaptureStatus;
  equityStatement?: string;
}

export interface ProtocolResource {
  label: string;
  address?: string;
  url?: string;
  note?: string;
}

// --------------------
// Existing types
// --------------------

export interface TokenRights {
  rights?: TokenRight[];
  governanceData?: GovernanceData;
  holdersRevenueAndValueAccrual?: HoldersRevenueAndValueAccrual;
  tokenAlignment?: TokenAlignment;
  resources?: ProtocolResource[];
}

type ProtocolCategoryOrTags =
  | {
      category: string;
      tags?: never;
    }
  | {
      tags: string[];
      category?: never;
    };

interface ProtocolBase {
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
  gecko_id: string | null;
  cmcId: string | null;
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
  excludeTvlFromParent?: boolean;
  deadUrl?: boolean; // for all domains that stopped being used, to avoid scammers registering there for a scam page
  deadFrom?: number | string; // for protocols that are dead, will trigger less frequent TVL updates
  tokensExcludedFromParent?: {
    [chain: string]: string[];
  };
  note?: string;
  previousNames?: string[];
  deprecated?: boolean;
  oraclesBreakdown?: Array<{
    name: string;
    type:
      | "Primary" // Oracle that secures more than 50% of protocol TVL, if oracle is hacked >50% of TVL will be lost
      | "Secondary" // Oracle that is actively used but secures less than 50% of TVL
      | "Fallback" // Oracle that isn't actively used and is just there in case the primary or secondary oracles fail
      | "RNG" // Oracle just used to provide random values (eg for games), it doesn't secure any TVL
      | "Aggregator" // Oracle used in conjuction with other oracles (eg by taking the median of multiple oracles), and thus a failure of it doesn't imply direct losses
      | "Reference" // Used for price display or off-chain quoting. Not directly used for critical protocol operations that would result in TVL loss if the oracle fails.
      | "PoR" // Proof of Reserve oracle, used to prove the protocol has the reserves to back the TVL
      // pls add more as needed
    proof: Array<string>,
    startDate?: string, // YYYY-MM-DD
    endDate?: string,
    chains?: Array<{
      chain: string;
      startDate?: string;
      endDate?: string;
    }>;
  }>;
  warningBanners?: Array<Banner>;
  hallmarks?: Hallmark[];
  misrepresentedTokens?: boolean;
  doublecounted?: boolean;
  methodology?: string;
  dimensions?: DimensionsConfig;
  tokenRights?: TokenRights;
}

export type Protocol = ProtocolBase & ProtocolCategoryOrTags;

export interface Banner {
  message: string;
  until?: number | string; // unix timestamp or "forever" or date string  in 'YYYY-MM-DD' format, 'forever' if the field is not set
  level: "low" | "alert" | "rug";
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
  warningBanners?: Array<Banner>;
  rugged?: boolean;
  deadUrl?: boolean;
  deprecated?: boolean;
  tokenRights?: TokenRights;
}
