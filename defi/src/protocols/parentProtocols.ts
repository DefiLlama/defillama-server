import { baseIconsUrl } from "../constants";
import type { IParentProtocol } from "./types";

/*
    leave `chains` and `category` as an empty array because we fill them based on their child protocols chains and category in api response
*/

const parentProtocols: IParentProtocol[] = [
  {
    id: "AAVE",
    name: "AAVE",
    url: "https://aave.com\r\n",
    description:
      "Aave is an Open Source and Non-Custodial protocol to earn interest on deposits and borrow assets",
    logo: `${baseIconsUrl}/aave-v2.png`,
    chains: [],
    gecko_id: "aave",
    cmcId: "7278",
    twitter: "AaveAave",
  },
  {
    id: "SushiSwap",
    name: "Sushi",
    url: "https://sushi.com/",
    description:
      "A fully decentralized protocol for automated liquidity provision on Ethereum.\r\n",
    logo: `${baseIconsUrl}/sushi.jpg`,
    gecko_id: "sushi",
    cmcId: "6758",
    chains: [],
    twitter: "SushiSwap",
  },
  {
    id: "SUN.io",
    name: "SUN",
    url: "https://sun.io",
    description:
      "First integrated platform for stablecoin swap, stake-mining, and self-governance on TRON",
    logo: `${baseIconsUrl}/sun.jpg`,
    gecko_id: "sun-token",
    cmcId: "10529",
    chains: [],
    twitter: "defi_sunio",
  },
  {
    id: "Benqi",
    name: "Benqi",
    url: "https://benqi.fi",
    description:
      "BENQI is a non-custodial liquidity market protocol, built on Avalanche. The protocol enables users to effortlessly lend, borrow, and earn interest with their digital assets.",
    logo: `${baseIconsUrl}/benqi-lending.jpg`,
    gecko_id: "benqi",
    cmcId: "9288",
    chains: [],
    twitter: "BenqiFinance",
  },
  {
    id: "incrementFinance",
    name: "Increment Finance",
    url: "https://increment.fi",
    description:
      "Increment Finance, One-stop DeFi Platform on Flow Blockchain.",
    logo: `${baseIconsUrl}/increment-lending.png`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "incrementfi",
  },
  {
    id: "podsFinance",
    name: "Pods",
    url: "https://www.pods.finance/",
    description:
      "Buliding DeFi, Strategies, primitives and tooling. Welcome to Pods.",
    logo: `${baseIconsUrl}/pods-finance.jpg`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "PodsFinance",
  },
  {
    id: "ApeSwap",
    name: "ApeSwap",
    url: "https://apeswap.finance",
    description:
      "ApeSwap is a Decentralized Autonomous Organization (DAO) that offers a full suite of tools to explore and engage with decentralized finance opportunities. Using the products within our DeFi Hub, users and partners can tap into this new wave of financial innovation in a secure, transparent, and globally accessible way",
    logo: `${baseIconsUrl}/apeswap.png`,
    gecko_id: "apeswap-finance",
    cmcId: "8497",
    chains: [],
    twitter: "ape_swap",
  },
  {
    id: "Parallel DeFi Super App",
    name: "Parallel DeFi Super App",
    url: "https://parallel.fi",
    description:
    "Parallel Finance is a Decentralized Money Market Protocol that offers lending, staking, and borrowing in the Polkadot ecosystem. Depositors can lend and stake simultaneously to earn double yield on their staked coins, and borrowers can collateralize to borrow.",
    logo: `${baseIconsUrl}/parallel-defi-super-app.jpg`,
    gecko_id: null ,
    cmcId: null,
    chains: [],
    twitter: "ParallelFi",
  },
  {
    id: "Value",
    name: "Value",
    url: "https://valuedefi.io",
    description:
    "The Value DeFi protocol is a platform and suite of products that aim to bring fairness, true value, and innovation to Decentralized Finance.`",
    logo: `${baseIconsUrl}/valuedefi.jpg`,
    gecko_id: "value-liquidity" ,
    cmcId: "1183",
    chains: [],
    twitter: "value_defi",
  },
  {
    id: "Magik Finance",
    name: "Magik Finance",
    url: "https://magik.finance/",
    description:
    "Yield Optimization as a Service and Algorithmic token pegged to $FTM on the Fantom Opera network.",
    logo: `${baseIconsUrl}/magik-finance.png`,
    gecko_id: "magik",
    cmcId: "17941",
    chains: [],
    twitter: "MagikDotFinance",
  },
  {
    id: "Huckleberry",
    name: "Huckleberry",
    url: "https://www.huckleberry.finance/",
    description:
    "Huckleberry is a community driven AMM crosschain DEX and lendin' platform built on Moonriver and CLV.",
    logo: `${baseIconsUrl}/huckleberry.png`,
    gecko_id: "huckleberry",
    cmcId: "12922",
    chains: [],
    twitter: "HuckleberryDEX",
  },
  {
    id: "MM Finance",
    name: "MM Finance",
    url: "https://linktr.ee/madmeerkat",
    description:
    "DeFi Ecosystem on Cronos and AMM on Polygon",
    logo: `${baseIconsUrl}/mm-finance.jpg`,
    gecko_id: null,
    cmcId: null,
    chains: [],
    twitter: "MMFcrypto",
  },
  {
    id: "Mycelium",
    name: "Mycelium",
    url: "https://swaps.mycelium.xyz",
    description:
    "Trade with liquidity, leverage, low fees.",
    logo: `${baseIconsUrl}/mycelium.jpg`,
    gecko_id: "mycelium",
    cmcId: "21437",
    chains: [],
    twitter: "mycelium_xyz",
  },
  {
    id: "Bancor",
    name: "Bancor",
    url: "https://app.bancor.network/",
    description:
    "Bancor is an on-chain liquidity protocol that enables automated, decentralized exchange on Ethereum and across blockchains.",
    logo: `${baseIconsUrl}/bancor.png`,
    gecko_id: "bancor",
    cmcId: "1727",
    chains: [],
    twitter: "Bancor",
  },
  {
    id: "SpiritSwap",
    name: "SpiritSwap",
    url: "https://app.spiritswap.finance/#/",
    description:
      "AMM and Lending protocol on Fantom",
    logo: `${baseIconsUrl}/spiritswap.jpg`,
    gecko_id: "spiritswap",
    cmcId: "1359",
    chains: [],
    twitter: "Spirit_Swap",
  },
  {
    id: "Interlay",
    name: "Interlay",
    url: "https://interlay.io/",
    description:
      "Fully trustless and decentralized Bitcoin bridge and BTC DeFi hub",
    logo: `${baseIconsUrl}/interlay.png`,
    gecko_id: "interlay",
    cmcId: "20366",
    chains: [],
    twitter: "InterlayHQ",
  },
  {
    id: "Frax Finance",
    name: "Frax Finance",
    url: "https://frax.finance/",
    description:
      "Inventors of the fractional stablecoin. $FRAX is the 1st stablecoin with parts backed & parts algorithmic",
    logo: `${baseIconsUrl}/frax finance.png`,
    gecko_id: "frax-share",
    cmcId: "6953",
    chains: [],
    twitter: "fraxfinance",
  },
];

export default parentProtocols;
