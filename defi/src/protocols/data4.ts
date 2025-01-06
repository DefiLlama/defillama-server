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
const data4: Protocol[] = [
  {
    id: "5580",
    name: "Latch",
    address: null,
    symbol: "-",
    url: "https://savings.latch.io/",
    description:
      "Deposit idle tokens, select a preferred vault, and earn yield and points",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/latch.jpg`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Yield",
    chains: ["Ethereum"],
    oracles: [],
    forkedFrom: [],
    module: "latch/index.js",
    twitter: "UseLatch",
    audit_links: ["https://docs.latch.io/overview/contracts-audit"],
    listedAt: 1736110559
  },
  {
    id: "5581",
    name: "Aquadex",
    address: null,
    symbol: "-",
    url: "https://aquadex.co/swap",
    description:
      "Decentralized exchange on Waterfall Network",
    chain: "Waterfall",
    logo: `${baseIconsUrl}/aquadex.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Waterfall"],
    oracles: [],
    forkedFrom: [],
    module: "aquadex-v3/index.js",
    twitter: "waterfall_dag",
    github: ["AquaDEX"],
    listedAt: 1736174541
  },
  {
    id: "5582",
    name: "Mantra AMM",
    address: null,
    symbol: "-",
    url: "https://mantra.zone/liquidity-pools",
    description:
      "Decentralized exchange on Mantra chain",
    chain: "Mantra",
    logo: `${baseIconsUrl}/mantra-amm.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Mantra"],
    oracles: [],
    forkedFrom: [],
    module: "mantra-amm/index.js",
    twitter: "MANTRA_Chain",
    listedAt: 1736174547
  },
  {
    id: "5583",
    name: "ILoop",
    address: null,
    symbol: "-",
    url: "https://app.iloop.finance/",
    description:
      "ILoop Protocol is a decentralized lending platform on the Solana blockchain, designed for secure and efficient leverage and capital optimization. ILoop stands out as an Automated DeFi protocol that integrates Lending, and Looping into a unified and secure DeFi product suite",
    chain: "Solana",
    logo: `${baseIconsUrl}/iloop.jpg`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Lending",
    chains: ["Solana"],
    oracles: [],
    forkedFrom: [],
    module: "iloop/index.js",
    twitter: "iLoop_HQ",
    audit_links: ["https://github.com/user-attachments/files/18279096/Iloop-contract.-.SlowMist.Audit.Report.pdf"],
    listedAt: 1736175355
  },
  {
    id: "5584",
    name: "Astrol",
    address: null,
    symbol: "-",
    url: "https://astrol.io/",
    description:
      "Lend, Borrow & Earn with ease on Eclipse",
    chain: "Eclipse",
    logo: `${baseIconsUrl}/astrol.jpg`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Lending",
    chains: ["Eclipse"],
    oracles: ["Pyth"], // https://doc.astrol.io/astrolend/oracle-usage
    forkedFrom: [],
    module: "astrolend/index.js",
    twitter: "AstrolFinance",
    audit_links: ["https://doc.astrol.io/astrolend/security"],
    github: ["Astrol-Finance"],
    listedAt: 1736175355
  },
  {
    id: "5585",
    name: "Omega",
    address: null,
    symbol: "-",
    url: "https://app.omega.xyz/",
    description:
      "Lending protocol that allows for a variety of assets to be used as collateral to access 6x leverage through various yield farming strategies across the Mantle Ecosystem",
    chain: "Mantle",
    logo: `${baseIconsUrl}/omega.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Leveraged Farming",
    chains: ["Mantle"],
    oracles: [], 
    forkedFrom: ["Juice Finance"],
    module: "omega/index.js",
    twitter: "omega_infra",
    listedAt: 1736176657
  },
  {
    id: "5586",
    name: "SatLayer",
    address: null,
    symbol: "-",
    url: "https://satlayer.xyz/",
    description:
      "SatLayer unleashes the possibilities of BTC, the world's best economic collateral, to secure any type of dApp or protocol as an Bitcoin Validated Service (BVS), fundamentally upgrading security for all of crypto",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/satlayer.jpg`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Restaked BTC",
    chains: ["Ethereum","Binance","Bitlayer"],
    oracles: [],
    forkedFrom: [],
    module: "satlayer/index.js",
    twitter: "satlayer",
    github: ["satlayer"],
    audit_links: [
      "https://github.com/satlayer/deposit-contract-public/blob/main/audits/Satlayer_audit_report_2024-08-15.pdf",
      "https://github.com/satlayer/deposit-contract-public/blob/main/audits/SatLayer%20Pool%20-%20Zellic%20Audit%20Report.pdf"
    ],
    listedAt: 1736176895
  },
];
export default data4;
