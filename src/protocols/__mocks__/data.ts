import { fetch as uniswap } from "../../../DefiLlama-Adapters/projects/uniswap";
import { fetch as aave } from "../../../DefiLlama-Adapters/projects/aave.js";

export default [
    {
      id: "1",
      name: "Uniswap",
      address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
      symbol: "UNI",
      url: "https://info.uniswap.org/",
      description:
        "A fully decentralized protocol for automated liquidity provision on Ethereum.\r\n",
      chain: "Ethereum",
      logo: null,
      audits: "2",
      audit_note: null,
      gecko_id: "uniswap",
      cmcId: "7083",
      category: "Dexes",
      tvlFunction: uniswap,
    },
    {
      id: "111",
      name: "AAVE",
      address: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
      symbol: "AAVE",
      url: "https://aave.com\r\n",
      description:
        "Aave is an Open Source and Non-Custodial protocol to earn interest on deposits and borrow assets",
      chain: "Ethereum",
      logo: null,
      audits: "2",
      audit_note: null,
      gecko_id: "aave",
      cmcId: "7278",
      category: "Lending",
      tvlFunction: aave,
    },
]