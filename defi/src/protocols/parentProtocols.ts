import { baseIconsUrl } from "../constants";
import type { IParentProtocol } from "./types";

/*
    leave `chains` and `category` as an empty array as we fill them based on their child protocols chains and category in api response
*/

const parentProtocols: IParentProtocol[] = [
  {
    id: "AAVE",
    name: "AAVE",
    url: "https://aave.com\r\n",
    description:
      "Aave is an Open Source and Non-Custodial protocol to earn interest on deposits and borrow assets",
    logo: `${baseIconsUrl}/aave.png`,
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
    logo: `${baseIconsUrl}/sushiswap.jpg`,
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
    logo: `${baseIconsUrl}/sun.io.jpg`,
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
    logo: `${baseIconsUrl}/benqi.jpg`,
    gecko_id: "benqi",
    cmcId: "9288",
    chains: ["Avalanche"],
    twitter: "BenqiFinance",
  },
];

export default parentProtocols;
