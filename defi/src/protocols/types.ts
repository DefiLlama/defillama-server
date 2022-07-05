export interface Protocol {
    id: string;
    name: string;
    address: string;
    symbol: string;
    url: string;
    description: string;
    chain: string;
    logo: null | string;
    audits: null | "0" | "1" | "2" | "3";
    audit_note: null;
    gecko_id: string;
    cmcId: string;
    category: string;
    chains: string[];
    oracles: string[];
    forkedFrom: string[];
    module: string;
    twitter: string;
    language?: string;
    audit_links?: string[];
    listedAt?: number;
    openSource?: boolean;
    parentProtocol?: string
  }