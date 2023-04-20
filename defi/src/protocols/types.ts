export interface Protocol {
    id: string;
    name: string;
    address?: string | null;
    symbol: string;
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
    module: string;
    twitter?: string | null;
    language?: string;
    audit_links?: Array<string>;
    listedAt?: number;
    openSource?: boolean;
    parentProtocol?: string;
    treasury?: string;
    referralUrl?: string;
    oraclesByChain?: {
      [chain:string]: string[]
    };
    governanceID?: Array<string>;
  }

  export interface IParentProtocol {
    id: string;
    name: string;
    url: string;
    description: string;
    logo: string;
    chains: Array<string>;
    gecko_id: string | null;
    cmcId: string | null;
    categories?: Array<string>;
    twitter: string;
    oracles?: Array<string>;
    forkedFrom?: Array<string>;
    governanceID?: Array<string>
  }