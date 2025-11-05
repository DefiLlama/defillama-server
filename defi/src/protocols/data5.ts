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
const data5: Protocol[] = [
  {
    id: "6957",
    name: "Clarity",
    address: "cardano:1e76aaec4869308ef5b61e81ebf229f2e70f75a50223defa087f807b",
    symbol: "CLARITY",
    url: "https://www.clarity.community/",
    description: "Clarity is a DAO tooling platform on Cardano.",
    chain: "Cardano",
    logo: `${baseIconsUrl}/clarity.jpg`,
    audits: "2",
    audit_note: null,
    gecko_id: "clarity-2",
    cmcId: null,
    category: "DAO Service Provider",
    chains: ["Cardano"],
    forkedFromIds: [],
    audit_links: ["https://github.com/Liqwid-Labs/agora/blob/staging/Agora%20audit%20report-v1.0.pdf"],
    module: "clarity/index.js",
    twitter: "clarity_dao",
    github: ["ClearContracts"],
    listedAt: 1762301111,
  },
  {
    id: "6958",
    name: "PotatoSwap V3",
    address: null,
    symbol: "-",
    url: "https://potatoswap.finance",
    description: "Discover Liquidity. Or Potatoes. Or a DEX + Launchpad natively built for the XLayerOfficial ecosystem.",
    chain: "X Layer",
    logo: `${baseIconsUrl}/potatoswap-v3.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexs",
    chains: ["X Layer"],
    forkedFromIds: ["2198"],
    audit_links: [],
    module: "potatoswap-v3/index.js",
    twitter: "PotatoSwap_Fi",
    listedAt: 1762301497,
    parentProtocol: "parent#potatoswap",
  },
  {
    id: "6959",
    name: "Lucky Peaches",
    address: null,
    symbol: "-",
    url: "http://luckypeach.xyz/",
    description: "Lucky Peaches is a fun decentralized lending protocol where you can lend your assets and win Peaches.",
    chain: "Hemi",
    logo: `${baseIconsUrl}/lucky-peaches.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Lending",
    chains: ["Hemi"],
    forkedFromIds: ["111"],
    audit_links: [],
    module: "luckypeaches/index.js",
    twitter: "luckypeachxyz",
    github: ["luckypeachxyz"],
    listedAt: 1762301789,
  },
  {
    id: "6961",
    name: "OroSwap",
    address: null,
    symbol: "-",
    url: "https://www.oroswap.org",
    description: "OroSwap is an AI-powered automated market maker (AMM) DEX on ZigChain with multiple pool types and fee tiers.",
    chain: "ZIGChain",
    logo: `${baseIconsUrl}/oroswap.jpg`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexs",
    chains: ["ZIGChain"],
    forkedFromIds: [],
    audit_links: ["https://www.halborn.com/audits/oroswap/cosmwasm-contracts-632648"],
    module: "oroswap/index.js",
    twitter: "oroswap",
    github: ["oroswap"],
    listedAt: 1762322081,
  },
];
export default data5;

