import type {Protocol} from './types'
import { baseIconsUrl } from "../constants";
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
export default [
{
    id: "1410",
    name: "Cropper",
    address: "solana:DubwWZNWiNGMMeeQHPnMATNj77YZPZSAz2WVR5WjLJqz",
    symbol: "CRP",
    url: "https://cropper.finance",
    description: "Cropper is an automated market maker (AMM) built on the Solana blockchain which enable lightning-fast trades, shared liquidity and new features for earning yield.",
    chain: "Solana",
    logo: `${baseIconsUrl}/cropper.png`,
    audits: "2",
    audit_note: null,
    gecko_id: "cropperfinance",
    cmcId: "11387",
    category: "Dexes",
    chains: ["Solana"],
    oracles: [],
    forkedFrom: [],
    module: "cropper.js",
    twitter: "CropperFinance",
    audit_links: [
      "https://github.com/HalbornSecurity/PublicReports/blob/master/Solana%20Program%20Audit/Cropper_Finance_Farm_Solana_Program_Security_Audit_Report_Halborn_Final.pdf",
      "https://github.com/HalbornSecurity/PublicReports/blob/master/Solana%20Program%20Audit/Cropper_Finance_AMM_Program_Security_Audit_Report_Halborn_Final.pdf",
    ],
    listedAt: 1644868660,
  },
  {
    id: "1411",
    name: "Manarium",
    address: "bsc:0xc80a0a55caf6a7bfb4ee22f9380c4077312c4a35",
    symbol: "ARI",
    url: "https://www.manarium.com",
    description: "Manarium is a unique blockchain gaming platform with play to earn games.",
    chain: "Binance",
    logo: `${baseIconsUrl}/manarium.png`,
    audits: "2",
    audit_note: null,
    gecko_id: "manarium",
    cmcId: "16474",
    category: "Gaming",
    chains: ["Binance"],
    oracles: [],
    forkedFrom: [],
    module: "manarium/index.js",
    twitter: "manarium_gg",
    audit_links: ["https://github.com/solidproof/smart-contract-audits/blob/main/SmartContract_Audit_Solidproof_Manarium.pdf"],
    listedAt: 1644868847,
  },
  {
    id: "1412",
    name: "Crema Finance",
    address: null,
    symbol: "-",
    url: "https://www.crema.finance",
    description: "Crema Finance is a powerful concentrated liquidity protocol built on Solana that provides superior performance for both traders and liquidity providers. It changes the Solana DeFi game by introducing a series of innovations to improve the overall capital efficiency and trading depth.",
    chain: "Solana",
    logo:`${baseIconsUrl}/crema-finance.png`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Solana"],
    oracles: [],
    forkedFrom: [],
    module: "crema.js",
    twitter: "Crema_Finance",
    listedAt: 1644868985,
  },
  {
    id: "1413",
    name: "Savannah Finance",
    address: "cronos:0x654bAc3eC77d6dB497892478f854cF6e8245DcA9",
    symbol: "SVN",
    url: "https://svn.finance",
    description: "The first and also largest algorithmic stablecoin platform on Cronos. $SVN is pegged to the price of 1 MMF via seigniorage.",
    chain: "Cronos",
    logo: `${baseIconsUrl}/savannah-finance.png`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Algo-Stables",
    chains: ["Cronos"],
    oracles: [],
    forkedFrom: ["Tomb Finance"],
    module: "svn/index.js",
    twitter: "MMFcrypto",
    audit_links: ["https://mmfinance.gitbook.io/docs/audit"],
    listedAt: 1644884068,
  },
  {
    id: "1414",
    name: "Dibs Money",
    address: "bsc:0xfd81ef21ea7cf1dc00e9c6dd261b4f3be0341d5c",
    symbol: "DIBS",
    url: "https://www.dibs.money/",
    description: "Fork of Tomb.Finance on the Binance Smart Chain with a 1000:1 peg to BNB.",
    chain: "Binance",
    logo: `${baseIconsUrl}/dibs-money.png`,
    audits: "2",
    audit_note: null,
    gecko_id: "dibs-money",
    cmcId: "16756",
    category: "Algo-Stables",
    chains: ["Binance"],
    oracles: [],
    forkedFrom: ["Tomb Finance"],
    module: "dibs-money/index.js",
    twitter: "DibsMoney",
    audit_links: ["https://github.com/interfinetwork/smart-contract-audits/blob/audit-updates/DibsMoney_AuditReport_InterFi.pdf"],
    listedAt: 1644886953,
  },
  {
    id: "1415",
    name: "Partial Finance",
    address: "fantom:0x9486fDA4C1192db69a08CA7235E2E6bAf31B467B",
    symbol: "PARTIAL",
    url: "https://partial.finance",
    description: "An algorithmic stablecoin on Fantom Opera, pegged to the price of 1/2 $FTM (0.5) via seigniorage.",
    chain: "Fantom",
    logo: `${baseIconsUrl}/dibs-money.png`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Algo-Stables",
    chains: ["Fantom"],
    oracles: [],
    forkedFrom: ["Tomb Finance"],
    module: "partialfinance/index.js",
    twitter: "PartialFinance",
    listedAt: 1644969685,
  },
  {
    id: "1416",
    name: "GemKeeper",
    address: null,
    symbol: "-",
    url: "https://app.gemkeeper.finance/#/swap",
    description: "GemKeeper is a community focused AMM & DeFi Platform built on Oasis.",
    chain: "Oasis",
    logo: `${baseIconsUrl}/dibs-money.png`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Oasis"],
    oracles: [],
    forkedFrom: ["Uniswap"],
    module: "gemkeeper.js",
    twitter: "GemKeeperDeFi",
    listedAt: 1644969875,
  },
  {
    id: "1417",
    name: "GemMine",
    address: "fantom:0x1e2a499fAefb88B2d085d7036f3f7895542b09De",
    symbol: "GEMMINE",
    url: "https://gemmine.defiwaterfall.com",
    description: "GemMine - this is not just a farm! It will bring together and help projects such as Waterfall, Knights of Fantom, Moneyrain & MyMine",
    chain: "Fantom",
    logo: `${baseIconsUrl}/dibs-money.png`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Yield",
    chains: ["Fantom"],
    oracles: [],
    forkedFrom: [],
    module: "gemmine/index.js",
    twitter: "defi_waterfall",
    listedAt: 1644970013,
  },
  {
    id: "1418",
    name: "Draco Finance",
    address: "fantom:0x37863ea4bf6ef836bC8bE909221BAF09A2aF43d7",
    symbol: "DRACO",
    url: "https://www.draco.finance/",
    description: "Algorithmic stable coin currently pegged to the value of 1 $FTM.",
    chain: "Fantom",
    logo: `${baseIconsUrl}/draco-finance.png`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Algo-Stables",
    chains: ["Fantom"],
    oracles: [],
    forkedFrom: ["Tomb Finance"],
    module: "draco-finance/index.js",
    twitter: "DracoFinance",
    listedAt: 1644972460,
  },
] as Protocol[]