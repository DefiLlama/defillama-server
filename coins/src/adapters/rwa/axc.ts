import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

interface TokenInfo {
  name: string;
  tokenAddress: string;
  pricerAddress: string;
}

interface ChainTokens {
  chain: string;
  tokens: TokenInfo[];
}

const CHAINS: ChainTokens[] = [
  {
    chain: "bsc",
    tokens: [
      {
        name: "GIFT",
        tokenAddress: "0x6Eca9D3B1ef79F5b45572fb8204835C6A4502bE9",
        pricerAddress: "0xCcaCA7A3b472843016E98db8EAF921A7a770f9eA",
      },
    ],
  }
];

export async function axc(timestamp: number): Promise<Write[]> {
  const writes: Write[] = [];

  for (const { chain, tokens } of CHAINS) {
    const api = await getApi(chain, timestamp);
    const pricesObject: any = {};

    const tokenAddresses = tokens.map((t) => t.tokenAddress);
    const pricerAddresses = tokens.map((t) => t.pricerAddress)
    const decimals = await api.multiCall({ abi: 'erc20:decimals', calls: tokenAddresses })
    const prices = await api.multiCall({ abi: "uint256:getLastData", calls: pricerAddresses })

    tokens.forEach((token, i) => {
      pricesObject[token.tokenAddress] = {
        price: prices[i] / (10 ** decimals[i]),
      }
    })
    await getWrites({ chain, timestamp, writes, pricesObject, projectName: "axc", confidence: 0.9 })
  }

  return writes;
}