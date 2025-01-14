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
    forkedFrom: ["Solidly"],
    module: "neptune/index.js",
    twitter: "NepFinance",
    listedAt: 1736278247
  },
  {
    id: "5597",
    name: "dappOS IntentEX", // previous dappOS 
    address: null,
    symbol: "-",
    url: "https://dappos.com/",
    description:
      "dappOS is an intent execution network",
    chain: "Op_Bnb",
    logo: `${baseIconsUrl}/dappos-intentex.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
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
  {
    id: "5599",
    name: "GRVT",
    address: null,
    symbol: "-",
    url: "https://grvt.io",
    description:
      "World's first licensed DEX, redesigning finance. Building true CeDeFi. Mainnet Alpha LIVE.",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/grvt.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Derivatives",
    chains: ["Ethereum"],
    oracles: [],
    forkedFrom: [],
    module: "grvt-io/index.js",
    twitter: "grvt_io",
    listedAt: 1736334414
  },
  {
    id: "5600",
    name: "Creator Bid",
    address: null,
    symbol: "-",
    url: "https://creator.bid/agents",
    description:
      "Create and tokenize AI agents , AI Launchpad on base",
    chain: "Base",
    logo: `${baseIconsUrl}/creator-bid.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "AI Agents",
    chains: ["Base"],
    oracles: [],
    forkedFrom: [],
    module: "dummy.js",
    twitter: "CreatorBid",
  },
  {
    id: "5601",
    name: "Verus Market",
    address: null,
    symbol: "-",
    url: "https://eth.verusbridge.io/",
    description:
      "Dex on Verus chain",
    chain: "Verus",
    logo: `${baseIconsUrl}/verus-market.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Verus"],
    oracles: [],
    forkedFrom: [],
    module: "verus-market/index.js",
    twitter: "VerusCoin",
    listedAt: 1736335147
  },
  {
    id: "5602",
    name: "NODO", // previously NODO Global
    address: null,
    symbol: "-",
    url: "https://nodo.xyz",
    description:
      "NODO is an omnichain AI-driven social copytrading ecosystem with real-time, instant-payout price prediction markets. Our flagship product NODO Trade is focused on DeFi interoperability, utilizing a robust cross-chain relayer and multi-brokerage AMM model to ensure capital efficiency and complete asset ownership for users. We're currently working to launch on SUI and Cardano. Powering our AI copytrading agent is aggregated trading data from top traders on NODO and across world-leading trading platforms, generating smart trading strategies devoid of the trappings of any emotional biases. Users can also safely farm yield from high-APY DeFi vaults via NODO Wallet, creating a robust and flexible social trading ecosystem with both high and low risk options",
    chain: "Avalanche",
    logo: `${baseIconsUrl}/nodo-global.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Trading App",
    chains: ["Avalanche", "Polygon", "Base", "Binance", "Celo"],
    oracles: [],
    forkedFrom: [],
    module: "nodo/index.js",
    twitter: "Official_NODO",
    github: ["NODO-xyz"],
    listedAt: 1736335147
  },
  {
    id: "5603",
    name: "2THICK", // previously Equalizer CL
    address: null,
    symbol: "ELITE",
    url: "https://eliteness.network/thick",
    description:
      "Protocol-agnostic Concentrated Liquidity Self-incentivizing AMM, now with Dynamic Trade Fee & Strategic TickSpacing based optimizations",
    chain: "Sonic",
    logo: `${baseIconsUrl}/2thick.png`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Sonic"],
    oracles: [],
    forkedFrom: ["Uniswap V3"],
    module: "equalizer-cl/index.js",
    twitter: "FTM1337",
    parentProtocol: "parent#guru-network-dao",
    listedAt: 1736387589
  },
  {
    id: "5604",
    name: "Memebox",
    address: null,
    symbol: "-",
    url: "https://memebox.fi/#/swap",
    description:
      "A decentralized exchange on Sonic",
    chain: "Sonic",
    logo: `${baseIconsUrl}/memebox.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Sonic"],
    oracles: [],
    forkedFrom: ["Uniswap V2"],
    module: "memebox-fi/index.js",
    twitter: "MemeboxFi",
    listedAt: 1736387595
  },
  {
    id: "5605",
    name: "MobiusDEX",
    address: "sonic:0xf3969639AE1f2716568eDBd0420153a6709f6e7b",
    symbol: "MDEX",
    url: "https://mobiusdex.xyz/",
    description:
      "A decentralized exchange on Sonic",
    chain: "Sonic",
    logo: `${baseIconsUrl}/mobiusdex.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Sonic"],
    oracles: [],
    forkedFrom: ["Uniswap V2"],
    module: "mobiusdex-xyz/index.js",
    twitter: "planetmobiusfun",
    github: ["planetmobius"],
    listedAt: 1736387601
  },
  {
    id: "5606",
    name: "WavesBridge",
    address: null,
    symbol: "-",
    url: "https://wavesbridge.io/",
    description:
      "Connecting Waves assets across blockchains",
    chain: "UNIT0",
    logo: `${baseIconsUrl}/wavesbridge.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Bridge",
    chains: ["UNIT0", "Waves", "Ethereum", "Binance", "Solana"],
    oracles: [],
    forkedFrom: [],
    module: "wavesbridge/index.js",
    twitter: "wavesbridge",
    github: ["WavesBridge"],
    listedAt: 1736387607
  },
  {
    id: "5607",
    name: "Marlin Protocol",
    address: "arbitrum:0xdA0a57B710768ae17941a9Fa33f8B720c8bD9ddD",
    symbol: "POND",
    url: "https://marlinprotocol.fi/relay/operator",
    description:
      "TEE coprocessors for decentralized AI",
    chain: "Arbitrum",
    logo: `${baseIconsUrl}/marlin-protocol.png`,
    audits: "0",
    audit_note: null,
    gecko_id: "marlin",
    cmcId: "7497",
    category: "Farm",
    chains: ["Arbitrum"],
    oracles: [],
    forkedFrom: [],
    module: "marlinprotocol/index.js",
    twitter: "MarlinProtocol",
    listedAt: 1736432811
  },
  {
    id: "5608",
    name: "Navigator",
    address: "sonic:0x6881B80ea7C858E4aEEf63893e18a8A36f3682f3",
    symbol: "NAVI",
    url: "https://www.navigator.exchange/",
    description:
      "Decentralized Liquidity Marketplace. Effortless trading, continuous liquidity. Across Crypto, Forex, and beyond",
    chain: "Sonic",
    logo: `${baseIconsUrl}/navigator.png`,
    audits: "0",
    audit_note: null,
    gecko_id: "navi-2",
    cmcId: null,
    category: "Derivatives",
    chains: ["Sonic"],
    oracles: ["Pyth"], // https://sonicscan.org/address/0xe9263682e837efabb145f8c632b9d2c518d90652#code
    forkedFrom: [],
    module: "navigator/index.js",
    twitter: "NaviExSonic",
    listedAt: 1736432817
  },
  {
    id: "5609",
    name: "Sophon Bridge",
    address: null,
    symbol: "-",
    url: "https://sophon.xyz/",
    description:
      "Sophon is a ZK chain",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/sophon.png`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Chain",
    chains: ["Ethereum"],
    oracles: [], 
    forkedFrom: [],
    module: "sophon/index.js",
    twitter: "sophon",
    listedAt: 1736469229
  },
  {
    id: "5610",
    name: "Crypto Valley Exchange",
    address: null,
    symbol: "-",
    url: "https://cvex.xyz/",
    description:
      "Decentralized platform for crypto futures and options trading. Enjoy low fees, efficient risk management, multichain support with no KYC required, and trade seamlessly using just USDC. Built for power and simplicity, CVEX is your gateway to smarter trading",
    chain: "Arbitrum",
    logo: `${baseIconsUrl}/crypto-valley-exchange.png`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Derivatives",
    chains: ["Arbitrum"],
    oracles: ["Internal"], // https://github.com/DefiLlama/DefiLlama-Adapters/pull/13046
    forkedFrom: [],
    module: "cvex/index.js",
    twitter: "cvex_xyz",
    listedAt: 1736469235
  },
  {
    id: "5611",
    name: "Silo V2",
    address: "0x6f80310ca7f2c654691d1383149fa1a57d8ab1f8",
    symbol: "SILO",
    url: "https://app.silo.finance",
    description: "Silo Finance creates permissionless and risk-isolated lending markets.",
    chain: "Arbitrum",
    logo: `${baseIconsUrl}/silo-finance.png`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Lending",
    chains: ["Arbitrum","Sonic"],
    oracles: [],
    forkedFrom: [],
    module: "silo-v2/index.js",
    twitter: "SiloFinance",
    audit_links: [],
    parentProtocol: "parent#silo-finance",
    listedAt: 1736470165,
  },
  {
    id: "5612",
    name: "Margin Zero",
    address: null,
    symbol: "-",
    url: "https://www.marginzero.xyz/",
    description:
      "MarginZero is an omni-chain, oracle-less and permission-less options & protected perpetual protocol",
    chain: "Sonic",
    logo: `${baseIconsUrl}/margin-zero.png`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Options",
    chains: ["Sonic"],
    oracles: [], 
    forkedFrom: [],
    module: "margin-zero/index.js",
    audit_links: ["https://github.com/marginzero-xyz/contracts/blob/main/audits/yAudits/MarginZero_yAudits_December2024_OptionsOTM.pdf"],
    twitter: "marginzero_xyz",
    github: ["marginzero-xyz"],
    listedAt: 1736470171
  },
  {
    id: "5613",
    name: "VinuNFT",
    address: null,
    symbol: "-",
    url: "VinuChain's premier NFT platform.",
    description:
      "MarginZero is an omni-chain, oracle-less and permission-less options & protected perpetual protocol",
    chain: "VinuChain",
    logo: `${baseIconsUrl}/vinunft.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "NFT Marketplace",
    chains: ["VinuChain"],
    oracles: [], 
    forkedFrom: [],
    module: "dummy.js",
    twitter: "VinuChain",
  },
  {
    id: "5614",
    name: "Pryzm Liquid Staking",
    address: null,
    symbol: "-", // preview only
    url: "https://app.pryzm.zone",
    description: "Liquid staking of native tokens for Cosmos-based chains",
    chain: "Pryzm",
    logo: `${baseIconsUrl}/pryzm-liquid-staking.png`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Liquid Staking",
    chains: ["Pryzm"],
    module: "pryzm-liquid-staking/index.js",
    twitter: "Pryzm_Zone",
    forkedFrom: [],
    oracles: [],
    audit_links: ["https://skynet.certik.com/projects/PRYZM"],
    parentProtocol: "parent#pryzm",
    listedAt: 1736533711
  },
  {
    id: "5615",
    name: "Zoth ZeUSD", // previously Zoth
    address: null,
    symbol: "-",
    url: "https://app.zoth.io/zeusd",
    description: `Zoth is an RWA ecosystem bringing institutional-grade yield avenues onchain.`,
    chain: "Ethereum",
    logo: `${baseIconsUrl}/zoth.jpg`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "CDP",
    chains: ["Ethereum"],
    oracles: [],
    module: "zoth-zeusd/index.js",
    twitter: "zothdotio",
    forkedFrom: [],
    audit_links: ["https://docs.zoth.io/zoth/resources/audits"],
    parentProtocol: "parent#zoth",
    listedAt: 1736774553
  },
  {
    id: "5616",
    name: "Republic Note", 
    address: null,
    symbol: "-",
    url: "https://republic.com/note",
    description: `One asset, broad exposure to venture & crypto`,
    chain: "Avalanche",
    logo: `${baseIconsUrl}/republic-note.png`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "RWA",
    chains: ["Avalanche"],
    oracles: [],
    module: "republic/index.js",
    twitter: "republicnote",
    forkedFrom: [],
    audit_links: [],
    listedAt: 1736775042
  },
  {
    id: "5617",
    name: "Aurum", 
    address: "avax:0x7F144F8691CbA3d2EfD8e5bcf042f9303EE31a46",
    symbol: "AUR",
    url: "https://aurumfi.io/",
    description: `Aurum: Unlocking seamless DeFi lending with innovative yield strategies and community-driven rewards.`,
    chain: "Sonic",
    logo: `${baseIconsUrl}/aurum.png`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Lending",
    chains: ["Sonic"],
    oracles: ["API3"], // https://aurum-finance.gitbook.io/docs
    module: "aurum/index.js",
    twitter: "AurumFi_Sonic",
    forkedFrom: ["AAVE V3"],
    audit_links: ["https://github.com/aave/aave-v3-core/tree/master/audits"],
    github: ["aurum-protocol"],
    listedAt: 1736775047
  },
  {
    id: "5618",
    name: "LFJ Aggregator",
    address: "avax:0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd",
    symbol: "JOE",
    url: "https://lfj.gg/arbitrum/trade",
    description:
      "DEX Aggregator by LFJ",
    chain: "Arbitrum",
    logo: `${baseIconsUrl}/lfj-aggregator.png`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "DEX Aggregator",
    chains: ["Avalanche", "Arbitrum"],
    module: "dummy.js",
    twitter: "LFJ_gg",
    forkedFrom: [],
    oracles: [],
    audit_links: [],
    parentProtocol: "parent#trader-joe",
    listedAt: 1736793159,
  },
  {
    id: "5619",
    name: "SSI",
    address: null,
    symbol: "-",
    url: "https://ssi.sosovalue.com/",
    description:
      "The SoSoValue Index (SSI) Protocol is a cutting-edge spot index solution designed to make crypto investments simple and secured",
    chain: "Base",
    logo: `${baseIconsUrl}/ssi.png`,
    audits: "2",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Indexes",
    chains: ["Base"],
    module: "ssi-protocol/index.js",
    twitter: "SoSoValueCrypto",
    forkedFrom: [],
    oracles: [],
    audit_links: [
      "https://github.com/blocksecteam/audit-reports/blob/main/solidity/blocksec_sosovaluelabs_ssi_v1.0-signed.pdf",
      "https://github.com/slowmist/Knowledge-Base/blob/master/open-report-V2/smart-contract/SSI%20Protocol%20-%20SlowMist%20Audit%20Report.pdf",
      "https://github.com/slowmist/Knowledge-Base/blob/master/open-report-V2/smart-contract/SSI%20Protocol%20Phase2%20-%20SlowMist%20Audit%20Report.pdf"
    ],
    github: ["SoSoValueLabs"],
    listedAt: 1736793641,
  },
  {
    id: "5620",
    name: "Botto",
    address: "0x9DFAD1b7102D46b1b197b90095B5c4E9f5845BBA",
    symbol: "BOTTO",
    url: "https://www.botto.fi/",
    description:
      "Botto is a decentralized autonomous artist",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/botto.png`,
    audits: "0",
    audit_note: null,
    gecko_id: "botto",
    cmcId: "14345",
    category: "AI Agents",
    chains: ["Ethereum", "Base"],
    module: "botto/index.js",
    twitter: "bottoproject",
    forkedFrom: [],
    oracles: [],
    audit_links: [],
    listedAt: 1736793647,
  },
  {
    id: "5621",
    name: "Anqa",
    address: null,
    symbol: "-",
    url: "https://app.anqa.ag/",
    description:
      "DEX Aggregator on Aptos",
    chain: "Aptos",
    logo: `${baseIconsUrl}/anqa.png`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "DEX Aggregator",
    chains: ["Aptos"],
    module: "dummy.js",
    twitter: "anqa_apt",
    forkedFrom: [],
    oracles: [],
    audit_links: [],
    listedAt: 1736794279,
  },

  {
    id: "5622",
    name: "Kyo Finance",
    address: null,
    symbol: "-",
    url: "https://www.kyo.finance",
    description:
      "The Most Innovative Liquidity Hub on soneium",
    chain: "Soneium",
    logo: `${baseIconsUrl}/kyo-finance.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Soneium"],
    module: "kyo-fi-v3/index.js",
    twitter: "kyofinance",
    forkedFrom: ["Uniswap V3"],
    oracles: [],
    audit_links: [],
    listedAt: 1736851067
  },
  {
    id: "5623",
    name: "SoneFi",
    address: null,
    symbol: "-",
    url: "https://sonefi.xyz",
    description:
      "One-stop trading Dex soneium, offering  AMM, Perp, AI Agent, and Meme Launch.",
    chain: "Soneium",
    logo: `${baseIconsUrl}/sonefi.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Dexes",
    chains: ["Soneium"],
    module: "sonefi-xyz/index.js",
    twitter: "SoneFi_xyz",
    forkedFrom: ["Uniswap V2"],
    oracles: [],
    audit_links: [],
    listedAt: 1736851567
  },
  {
    id: "5624",
    name: "Soneium Bridge",
    address: null,
    symbol: "-",
    url: "https://superbridge.app/soneium",
    description:
      "Bridge between Ethereum and Soneium",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/soneium-bridge.jpg`,
    audits: "0",
    audit_note: null,
    gecko_id: null,
    cmcId: null,
    category: "Chain",
    chains: ["Ethereum"],
    module: "soneium/index.js",
    twitter: "soneium",
    forkedFrom: [],
    oracles: [],
    audit_links: [],
  },
        {
    id: "5625",
    name: "Lagoon",
    symbol: "-",
    url: "https://lagoon.finance",
    description:
      "Lagoon provides an infrastructure to launch, manage and scale on-chain vaults — powered by ERC-4626 standard and Safe. Users can enter any strategies and earn interest over their assets. While each curator process deposits and withdrawals in an asynchronous manner and at different intervals",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/lagoon.jpg`,
    audits: "2",
    gecko_id: null,
    cmcId: null,
    category: "Yield",
    chains: ["Ethereum", "Base"],
    module: "lagoon/index.js",
    language: "Solidity",
    github: ["hopperlabsxyz"],
    audit_links: ["https://docs.lagoon.finance/resources/audits"],
    twitter: "lagoon_finance",
   }
  
];
export default data4;
