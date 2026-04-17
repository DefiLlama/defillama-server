import { baseIconsUrl } from "../constants";
import type { Protocol } from "./types";
/*
{
  id: string;
  name: string;
  address: string;
  symbol: string;
  url: string;
  description: string;
  chain: string;
  logo: null | string;
  audits: null | "0" | "1" | "2" | "3";
  gecko_id: string;
  cmcId: string;
  category: string;
  chains: string[];
  oracles: string[];
  forkedFrom: string[];
  module: string;
  twitter: string;
  language?: string;
  treasury?: string;
  tokensExcludedFromParent: {
      Avalanche: ["GPC"],    // ADD ALL TIME WITH BIG LETTER, NOT SMALL LETTER
    },
  excludeTvlFromParent?: boolean;
},
*/
/* Audits: Please follow this legend
0 -> No audits
1 -> Part of this protocol may be unaudited
2 -> Yes
3 -> This protocol is a fork of an existing audited protocol
*/
/*
`chain` is the first chain of a protocol we tracked at defillama,
  so if a protocol launches on Ethereum and we start tracking it there, and then it launches on polygon and
  we start tracking it on both polygon and ethereum, then `chain` should be set to `Ethereum`.
`chains` is not used by the current code, but good to fill it out because it is used in our test to detect errors
*/
const data6: Protocol[] = [
  {
    id: "7709",
    name: "MOKEE",
    address: null,
    symbol: "-",
    url: " ", // pending to add url https://www.mokee.app/
    description:
      "MOKEE Protocol is the first non-custodial crypto fail-safe protocol. Users deposit native tokens into personal vaults, designate heirs, and set an inactivity threshold",
    chain: "Binance",
    logo: `${baseIconsUrl}/monkee.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Token Locker",
    chains: ["Binance", "Base","Ethereum", "Polygon", "Arbitrum", "Optimism"],
    module: "monkee/index.js",
    twitter: "MokeeApp",
    audit_links: [],
    listedAt: 1776463251
  },
  {
    id: "7710",
    name: "Trinity Protocol",
    address: null,
    symbol: "-",
    url: " ", // pending to add url https://graceful-begonia-2b7634.netlify.app/.
    description:
      "Gold-collateralized USDC lending market on Morpho Blue (Arbitrum One)",
    chain: "Arbitrum",
    logo: `${baseIconsUrl}/trinity-protocol.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Risk Curator",
    chains: ["Arbitrum"],
    module: "trinity-protocol/index.js",
    twitter: "cameron_arc_ai",
    audit_links: [],
    listedAt: 1776465699
  },
];
export default data6;