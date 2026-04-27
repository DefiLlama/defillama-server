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
        name: "GYTW",
        tokenAddress: "0xfC787d44f3754aDd0242204533b2B4A7eB9876e1",
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