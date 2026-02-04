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
        chain: "hsk",
        tokens: [
            {
                name: "AoABT",
                tokenAddress: "0x80C080acd48ED66a35Ae8A24BC1198672215A9bD",
                pricerAddress: "0xD72529F8b54fcB59010F2141FC328aDa5Aa72abb",
            },
            {
                name: "AoABTa12m",
                tokenAddress: "0xf00A183Ae9DAA5ed969818E09fdd76a8e0B627E6",
                pricerAddress: "0x9BB1a9f99070341eADf705B8B973474EF2b9790F",
            },
            {
                name: "AoABTb",
                tokenAddress: "0x34B842D0AcF830134D44075DCbcE43Ba04286c12",
                pricerAddress: "0x8dB72b8F7F896569F6B254263D559902Ea2A9B35",
            },
        ],
    },
    {
        chain: "avax",
        tokens: [
            {
                name: "AoABTd",
                tokenAddress: "0xB2EA3E7b80317c4E20D1927034162176e25834E2",
                pricerAddress: "0xb7e8aCD88701823B68530b1467107E7196F775AE",
            },
        ],
    },
];

export async function asseto(timestamp: number): Promise<Write[]> {
  const writes: Write[] = [];

  for (const { chain, tokens } of CHAINS) {
    const api = await getApi(chain, timestamp);
    const pricesObject: any = {};

    const tokenAddresses = tokens.map((t) => t.tokenAddress);
    const pricerAddresses = tokens.map((t) => t.pricerAddress)
    const decimals = await api.multiCall({ abi: 'erc20:decimals', calls: tokenAddresses })
    const prices = await api.multiCall({ abi: "uint256:getLatestPrice", calls: pricerAddresses })

    tokens.forEach((token, i) => {
      pricesObject[token.tokenAddress] = {
        price: prices[i] / (10 ** decimals[i]),
      }
    })
    await getWrites({ chain, timestamp, writes, pricesObject, projectName: "asseto", confidence: 0.9 })
  }

  return writes;
}