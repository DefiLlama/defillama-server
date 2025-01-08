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
  {
    id: "5587",
    name: "Coinbase Wallet",
    address: null,
    symbol: "-",
    url: "https://wallet.coinbase.com/",
    description:
      "Crypto wallet and dapp browser",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/coinbase-wallet.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Wallets",
    chains: ["Ethereum","Arbitrum","Optimism","Polygon","Base","Avalanche","Binance"],
    oracles: [],
    forkedFrom: [],
    module: "dummy.js",
    twitter: "CoinbaseWallet",
  },
  {
    id: "5588",
    name: "YieldFi",
    address: null,
    symbol: "-",
    url: "https://yield.fi/",
    description:
      "YieldFi: The First Streamlined Asset Management Platform",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/yieldfi.jpg`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Yield Aggregator",
    chains: ["Ethereum","Optimism","BOB"],
    oracles: [],
    forkedFrom: [],
    module: "yield-fi/index.js",
    twitter: "getyieldfi",
    github: ["YieldFiLabs"],
    audit_links: [
      "https://docs.yield.fi/resources/audits"
    ],
    listedAt: 1736184965
  },
  {
    id: "5589",
    name: "dTRINITY dUSD",
    address: null,
    symbol: "-",
    url: "https://app.dtrinity.org/dusd/",
    description:
      "dTRINITY is a decentralized and community-governed on-chain replication of the US Federal Reserve, operating under a full-reserve model for enhanced stability and sustainability. It features three core DeFi primitives: a native stablecoin (dUSD) serving as a unified liquidity layer, money markets (dLEND), and integrations with external liquidity pools like Curve",
    chain: "Fraxtal",
    logo: `${baseIconsUrl}/dtrinity.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Partially Algorithmic Stablecoin",
    chains: ["Fraxtal"],
    oracles: [],
    forkedFrom: [],
    module: "dtrinity/index.js",
    twitter: "dtrinity_defi",
    parentProtocol: "parent#dtrinity",
    listedAt: 1736185537
  },
  {
    id: "5590",
    name: "dTRINITY dLEND",
    address: null,
    symbol: "-",
    url: "https://app.dtrinity.org/dlend/lending-borrow/",
    description:
      "dLEND is a Fraxtal-based fork of the Aave v3 protocol, designed for secure lending and borrowing of dUSD and other digital assets. By default, dUSD is the sole borrowable asset, and loans can only be taken against other supplied assets, excluding dUSD. This prevents rehypothecation of collateral, reducing protocol risks and subsidy arbitrage. Borrowing rates for dUSD are subsidized through regular interest rebates, encouraging demand and utilization while offering lower costs for borrowers and sustainable yields for lenders",
    chain: "Fraxtal",
    logo: `${baseIconsUrl}/dtrinity.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Lending",
    chains: ["Fraxtal"],
    oracles: [],
    forkedFrom: ["AAVE V3"],
    module: "dtrinity-dlend/index.js",
    twitter: "dtrinity_defi",
    parentProtocol: "parent#dtrinity",
    listedAt: 1736185543
  },
  {
    id: "5591",
    name: "Aethir",
    address: "arbitrum:0xbe0Ed4138121EcFC5c0E56B40517da27E6c5226B",
    symbol: "ATH",
    url: "https://aethir.com/",
    description: "Powerful GPU compute solutions on-demand.",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/aethir.png`,
    audits: "0",
    audit_note: null,
    gecko_id: "aethir",
    cmcId: null,
    category: "Chain",
    chains: ["Ethereum"],
    oracles: [],
    forkedFrom: [],
    module: "dummy.js",
    twitter: "AethirCloud",
  },
  {
    id: "5592",
    name: "Prime Staking",
    address: null,
    symbol: "-",
    url: "https://primestaking.xyz/",
    description:
      "Liquid staking on XDC",
    chain: "XDC",
    logo: `${baseIconsUrl}/prime-staking.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Liquid Staking",
    chains: ["XDC"],
    oracles: [],
    forkedFrom: [],
    module: "primestaking-xyz/index.js",
    twitter: "PrimeNumbersFi",
    listedAt: 1736202245
  },
  {
    id: "5593",
    name: "InkySwap",
    address: null,
    symbol: "-",
    url: "https://inkyswap.com/",
    description:
      "The decentralized exchange on Ink, where InkyPump's tokens get their liquidity once they are bonded.",
    chain: "Ink",
    logo: `${baseIconsUrl}/inkyswap.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Ink"],
    oracles: [],
    forkedFrom: ["Uniswap V2"],
    module: "inkyswap/index.js",
    twitter: "inkyswap",
    github: ["InkySwap"],
    listedAt: 1736202627
  },
  {
    id: "5594",
    name: "MONSTRO",
    address: null,
    symbol: "-",
    url: "https://v2.monstro.fun",
    description:
      "Protocol on base chain",
    chain: "Base",
    logo: `${baseIconsUrl}/monstro.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Yield",
    chains: ["Base"],
    oracles: [],
    forkedFrom: [],
    module: "monstro-fun/index.js",
    treasury: "monstro-fun.js",
    twitter: "monstrosuni",
    listedAt: 1736249582
  },
  {
    id: "5595",
    name: "GOLDSTATION DEX V3",
    address: null,
    symbol: "-",
    url: "https://goldstation.io",
    description:
      "Your Gateway to Decentralized Finance with Real Asset Integration",
    chain: "Avalanche",
    logo: `${baseIconsUrl}/goldstation-dex-v3.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Avalanche"],
    oracles: [],
    forkedFrom: ["Uniswap V3"],
    module: "goldstation-dex-v3/index.js",
    twitter: "goldstation_io",
    parentProtocol: "parent#goldstation",
    tokensExcludedFromParent: {
      Avalanche: ["GPC"],
    },
    listedAt: 1736249628
  },
  {
    id: "5596",
    name: "Neptune",
    address: null,
    symbol: "-",
    url: "https://nep.finance/",
    description:
      "The Premier DEX on Swellchain",
    chain: "Swellchain",
    logo: `${baseIconsUrl}/neptune.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Swellchain"],
    oracles: [],
    forkedFrom: ["Uniswap V2"],
    module: "neptune/index.js",
    twitter: "NepFinance",
    listedAt: 1736278247
  },
  {
    id: "5597",
    name: "dappOS",
    address: null,
    symbol: "-",
    url: "https://dappos.com/",
    description:
      "dappOS is an intent execution network",
    chain: "Op_Bnb",
    logo: `${baseIconsUrl}/dappos.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Cross Chain",
    chains: ["Op_Bnb"],
    oracles: [],
    forkedFrom: [],
    module: "dummy.js",
    twitter: "dappOS_com",  
  },
  {
    id: "5598",
    name: "VolBoost",
    address: null,
    symbol: "-",
    url: "https://volboost.com/",
    description:
      "Boost your token's volume, liquidity and visibility in one click",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/volboost.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Volume Boosting",
    chains: ["Ethereum","Base","Binance"],
    oracles: [],
    forkedFrom: [],
    module: "dummy.js",
    twitter: "volboost",  
  },
];
export default data4;
