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
    logo: `${baseIconsUrl}/mokee.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Token Locker",
    chains: ["Binance", "Base","Ethereum", "Polygon", "Arbitrum", "Optimism"],
    module: "mokee/index.js",
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
    category: "Risk Curators",
    chains: ["Arbitrum"],
    module: "trinity-protocol/index.js",
    twitter: "cameron_arc_ai",
    audit_links: [],
    listedAt: 1776465699
  },
  {
    id: "7711",
    name: "Liquid Protocol",
    address: null,
    symbol: "-",
    url: "https://app.liquidprotocol.org/tokens",
    description:
      "Liquid Protocol deploys ERC-20 tokens on Base with Uniswap V4 pools, locked liquidity, and configurable fee distribution",
    chain: "Base",
    logo: `${baseIconsUrl}/liquid-protocol.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Launchpad",
    chains: ["Base"],
    module: "dummy.js",
    twitter: "LIQUIDPROTOCOL",
    github: ["Liquid-Protocol-Ops"],
    dimensions: {
      fees: "liquid-protocol",
    },
  },
  {
    id: "7712",
    name: "Rainbow Token Launchpad",
    address: null,
    symbol: "-",
    url: "https://rainbow.me/",
    description:
      "A launchpad platform built by Rainbow team",
    chain: "Base",
    logo: `${baseIconsUrl}/rainbow-token-launchpad.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Launchpad",
    chains: ["Base"],
    module: "dummy.js",
    twitter: "rainbowdotme",
    parentProtocol: "parent#rainbow",
    dimensions: {
      fees: "rainbow-token-launchpad",
    },
  },
  {
    id: "7713",
    name: "GrelfSwap",
    address: null,
    symbol: "-",
    url: " ", // pending to add url https://grelfswap.com/
    description:
      "GrelfSwap is a DEX aggregator on Hedera",
    chain: "Hedera",
    logo: `${baseIconsUrl}/grelfswap.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "DEX Aggregator",
    chains: ["Hedera"],
    module: "dummy.js",
    twitter: null,
    dimensions: {
      aggregators: "grelfswap",
    },
  },
  {
    id: "7714",
    name: "Circle CCTP",
    address: null,
    symbol: "-",
    url: "https://www.circle.com/cross-chain-transfer-protocol",
    description: "Circle helps businesses and developers harness the power of USDC for payments and commerce",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/circle-cctp.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Bridge",
    chains: ["Ethereum", "Base", "Polygon", "Optimism", "Arbitrum", "Avalanche", "Monad", "Unichain", "Linea", "Plume Mainnet", "Sonic", "World Chain", "XDC", "Hyperliquid L1", "Ink"],
    module: "dummy.js",
    twitter: "circle",
    stablecoins: ["usd-coin"],
    parentProtocol: "parent#circle",
    dimensions: {
      fees: "cctp"
    }
  },
  {
    id: "7715",
    name: "Paxos Stablecoin Issuer",
    address: null,
    symbol: "-",
    url: "https://paxos.com/",
    description:
      "Paxos is a financial technology company that provides stablecoin services to businesses and developers",
    chain: "Off Chain",
    logo: `${baseIconsUrl}/paxos-stablecoin-issuer.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Stablecoin Issuer",
    chains: ["Off Chain"],
    module: "dummy.js",
    twitter: "Paxos",
    parentProtocol: "parent#paxos",
    dimensions: {
      fees: "paxos"
    }
  },
  {
    id: "7716",
    name: "Lucky38",
    address: null,
    symbol: "-",
    url: " ", // pending to add url https://randomy.fun/
    description:
      "On-chain games for Openclaw on Base",
    chain: "Base",
    logo: `${baseIconsUrl}/lucky38.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Luck Games",
    chains: ["Base"],
    module: "lucky38/index.js",
    twitter: null,
    listedAt: 1776628155
  },
  {
    id: "7717",
    name: "ENNI",
    address: "0xE364450b3F702d12b02F0290E0392f02DE53b8E2",
    symbol: "ENNI",
    url: " ", // pending to add url https://enni.ch
    description:
      "Immutable CDP protocol on Ethereum. Borrow stablecoins against WETH at 0% interest. No governance. No admin keys",
    chain: "Ethereum",
    logo: `${baseIconsUrl}/enni.jpg`,
    audits: "2",
    gecko_id: null,
    cmcId: null,
    category: "CDP",
    chains: ["Ethereum"],
    module: "enni/index.js",
    oraclesBreakdown: [ 
      { name: "Chainlink", type: "Primary", proof: ["https://enni.ch/docs/security/oracles"] },
      { name: "RedStone", type: "Fallback", proof: ["https://enni.ch/docs/security/oracles"] } 
    ],
    twitter: "Enni_Index",
    audit_links: ["https://enni.ch/Hashlock-Audit.pdf", "https://enni.ch/Blockbite-Audit.pdf"],
    github: ["enni-ch"],
    listedAt: 1776628713,
  },
  {
    id: "7718",
    name: "SuiDex",
    address: null,
    symbol: "-",
    url: "https://dex.suidex.org/",
    description:
      "SuiDex is a Uniswap V2-style AMM DEX on Sui with 54 active trading pairs, yield farming (SuiFarm), and a VICTORY token locker",
    chain: "Sui",
    logo: `${baseIconsUrl}/suidex.jpg`,
    audits: "2",
    gecko_id: null,
    cmcId: null,
    tags: ["AMM"],
    chains: ["Sui"],
    module: "suidex/index.js",
    twitter: "suidexHQ",
    audit_links: ["https://suidex.gitbook.io/suidex/information/audits"],
    listedAt: 1776658891,
  },
  {
    id: "7719",
    name: "Durianfun",
    address: null,
    symbol: "-",
    url: " ", // pending to add url https://durianfun.xyz/
    description:
      "Fair-launch meme-token launchpad on KUB. Tokens start on an exponential bonding curve, then graduate to a sealed DurianAMM liquidity pool. No presale, no team allocation, 14.3% of trading fees shared back to creators",
    chain: "Bitkub",
    logo: `${baseIconsUrl}/durianfun.jpg`,
    audits: "2",
    gecko_id: null,
    cmcId: null,
    category: "Launchpad",
    chains: ["Bitkub"],
    module: "durianfun/index.js",
    twitter: "duriandotfun",
    audit_links: ["https://durianandfun.gitbook.io/durianfun/overall-audits"],
    github: ["Duriandotfun"],
    listedAt: 1776659179,
  },
  {
    id: "7720",
    name: "Milk Finance",
    address: null,
    symbol: "-",
    url: "https://app.basedmilk.com",
    description:
      "Milk Finance is a USDC-backed stablecoin lending protocol on Base",
    chain: "Base",
    logo: `${baseIconsUrl}/milk-finance.jpg`,
    audits: "3",
    gecko_id: null,
    cmcId: null,
    category: "Lending",
    chains: ["Base"],
    module: "milk-finance/index.js",
    twitter: "gotBasedMilk",
    listedAt: 1776659651,
  },
  {
    id: "7721",
    name: "SoulBound Finance",
    address: null,
    symbol: "-",
    url: " ", // pending to add url https://soulbound.finance
    description:
      "SoulBound Finance is a privacy-focused transfer protocol on Arbitrum that enables encrypted, wallet-to-wallet payments using one-time redeemable codes. It supports assets like ETH and stablecoins, with batched redemptions and a design that prevents linking senders to recipients",
    chain: "Arbitrum",
    logo: `${baseIconsUrl}/soulbound-finance.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Payments",
    chains: ["Arbitrum"],
    module: "soulbound-finance/index.js",
    twitter: "SoulboundSec",
    github: ["SoulboundSecurity"],
    listedAt: 1776740719,
  },
  {
    id: "7722",
    name: "Pyron",
    address: null,
    symbol: "-",
    url: "https://pyron.fi/",
    description:
      "Asset productivity layer of Fogo. Lend and Borrow without the wait, noise, or limits",
    chain: "Fogo",
    logo: `${baseIconsUrl}/pyron.jpg`,
    audits: "2",
    gecko_id: null,
    cmcId: null,
    category: "Lending",
    chains: ["Fogo"],
    module: "pyron/index.js",
    twitter: "Pyronfi",
    github: ["pyron-finance"],
    audit_links: ["https://github.com/zenith-security/reports/blob/main/reports/Pyron%20Lendr%20-%20Zenith%20Audit%20Report.pdf"],
    listedAt: 1776741147,
  },
  {
    id: "7723",
    name: "PMI Protocol",
    address: "polygon:0x9DD6641423200b1FBd0BFF45f376BEE66Be1F4E4",
    symbol: "PMI",
    url: " ", // pending to add url https://pmiprotocol.xyz
    description:
      "On-chain index fund for prediction market infrastructure tokens. Deposit USDC, receive PMI shares at NAV. Vault holds UMA, WMATIC, and GNO via Uniswap V3",
    chain: "Polygon",
    logo: `${baseIconsUrl}/pmi-protocol.jpg`,
    audits: "2",
    gecko_id: null,
    cmcId: null,
    category: "Indexes",
    chains: ["Polygon"],
    module: "pmi-protocol/index.js",
    twitter: "predictionidx",
    github: ["ninjacornix"],
    listedAt: 1776741431,
  },
  {
    id: "7724",
    name: "Vaultfire",
    address: null,
    symbol: "-",
    url: " ", // pending to add url project didn't submit url
    description:
      "Vaultfire is an AI agent trust infrastructure protocol",
    chain: "Base",
    logo: `${baseIconsUrl}/vaultfire.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "AI Agents",
    chains: ["Base", "Avalanche", "Arbitrum", "Polygon"],
    module: "vaultfire/index.js",
    twitter: null,
    listedAt: 1776741959,
  },
  {
    id: "7725",
    name: "TopStrike",
    address: null,
    symbol: "-",
    url: "https://topstrike.io",
    description:
      "Real-time, one-tap Football trading game powered by MegaETH",
    chain: "MegaETH",
    logo: `${baseIconsUrl}/topstrike.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Gaming",
    chains: ["MegaETH"],
    module: "dummy.js",
    twitter: "TopStrikeIO",
    dimensions: {
      dexs: "topstrike",
    },
  },
  {
    id: "7726",
    name: "ASPE Labs",
    address: null,
    symbol: "-",
    url: " ", // pending to add url https://aspelabs.xyz
    description:
      "Automated yield vault on HyperEVM. ERC4626-compliant; deposits USDC, trades on HyperCore via an agent wallet, and returns profits through share price appreciation",
    chain: "Hyperliquid L1",
    logo: `${baseIconsUrl}/aspe-labs.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Yield",
    chains: ["Hyperliquid L1"],
    module: "aspe-labs/index.js",
    twitter: "AspeLabs",
    github: ["aspe-labs"],
    listedAt: 1776742731,
  },
  {
    id: "7727",
    name: "Hubra",
    address: null,
    symbol: "-",
    url: "https://hubra.app/",
    description:
      "Hubra is a Solana-based DeFi protocol providing institutional-grade, non-custodial yield products, including liquid staking (raSOL) and automated yield vaults (raUSDC, raUSDT, raUSDS, raUSDG, raUSD1). It is designed to make professional yield strategies accessible to everyone",
    chain: "Solana",
    logo: `${baseIconsUrl}/hubra.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Yield",
    chains: ["Solana"],
    module: "hubra/index.js",
    twitter: "HubraApp",
    github: ["Hubra-labs"],
    listedAt: 1776742981,
  },
  {
    id: "7728",
    name: "Apiary",
    address: "berachain:0x5e4d5f1E7b69Cdcd3faDb0cf182ea7821070Cbb5",
    symbol: "APIARY",
    url: "https://www.apiary.fi/",
    description:
      "Treasury-backed protocol designed to perpetually accumulate $BGT (Berachain Governance Token) through Berachain's Proof of Liquidity (PoL)",
    chain: "Berachain",
    logo: `${baseIconsUrl}/apiary.jpg`,
    audits: "0",
    gecko_id: null,
    cmcId: null,
    category: "Reserve Currency",
    chains: ["Berachain"],
    module: "apiary/index.js",
    twitter: "ApiaryFi",
    listedAt: 1776798425,
  },
  {
    id: "7729",
    name: "Dumpfun Gamified Launcher",
    address: null,
    symbol: "-",
    url: " ", // pending to add url https://dumpfun.io
    description:
      "Dumpfun Gamified Launcher is a gamified token launchpad on Solana. Anyone can launch a mining token; users deploy SOL to a 5x5 grid per round, and VRF-picked winning squares split a SOL + token reward pool. Per reset: 87% winners, 1% creator, 10% buy-and-burn, 0.5% platform fee, 1.4% per-token motherlode, 0.1% global motherlode",
    chain: "Solana",
    logo: `${baseIconsUrl}/dumpfun-gamified-launcher.jpg`,
    audits: "2",
    gecko_id: null,
    cmcId: null,
    category: "Gamified Mining",
    chains: ["Solana"],
    module: "dumpfun-gamified-launcher/index.js",
    twitter: "dumpfundotio",
    audit_links: ["https://skynet.certik.com/projects/dumpfun"],
    listedAt: 1776798678,
  },
];
export default data6;