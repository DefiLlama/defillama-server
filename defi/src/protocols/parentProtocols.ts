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
  }
];

export default parentProtocols;
