import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";

export const config: any = {
  avax: {
    tokens: {
      "SUZ": "0xcd94a87696FAC69Edae3a70fE5725307Ae1c43f6",
    }
  }
}

async function getOdosPrice(chainId: number, tokenAddress: string): Promise<number | null> {
  try {
    const url = `https://api.odos.xyz/pricing/token/${chainId}/${tokenAddress}`;

    const response = await fetch(url, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.price && data.currencyId === "USD") {
      return data.price;
    } else {
      console.log("Unexpected Odos response format");
      return null;
    }

  } catch (error) {
    console.error(`Odos API error:`, error);
    return null;
  }
}

export async function getTokenPrices(timestamp: number): Promise<Write[]> {
  const writes: Write[] = [];
  const chain = "avax";
  const chainId = 43114;
  const api = await getApi(chain, timestamp);
  const { tokens } = config[chain];
  const tokenAddress = Object.values(tokens)[0] as string;

  try {
    const usdPrice = await getOdosPrice(chainId, tokenAddress);

    if (usdPrice === null) {
      console.log("No price available from Odos API");
      return [];
    }

    const [symbol, decimals, name] = await Promise.all([
      api.call({ target: tokenAddress, abi: 'string:symbol', permitFailure: true }),
      api.call({ target: tokenAddress, abi: 'uint8:decimals', permitFailure: true }),
      api.call({ target: tokenAddress, abi: 'string:name', permitFailure: true })
    ]);

    const write: Write = {
      PK: `asset#${chain}:${tokenAddress.toLowerCase()}`,
      SK: timestamp,
      price: usdPrice,
      adapter: "suzaku",
      symbol: symbol,
      decimals: decimals,
      confidence: 0.9
    };

    writes.push(write);
    return writes;

  } catch (error) {
    console.error(`Error getting token data:`, error);
    return [];
  }
}
