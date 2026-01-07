import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import axios from "axios";

const config: { [chain: string]: { [symbol: string]: string } } = {
  hyperevm: {
    HAR: "0x391121d817da42ed3434d281aedbbcc416a2af18",
  },
};

export async function harmonix(timestamp: number) {
  const writes: Write[] = [];
  const confidence = 0.9;

  for (const chain of Object.keys(config)) {
    const tokens = config[chain];
    const tokenAddrs = Object.values(tokens);
    const addrParam = tokenAddrs.join(",");
    const url = `https://api.geckoterminal.com/api/v2/simple/networks/${chain}/token_price/${addrParam}`;

    try {
      const { data } = await axios.get(url);
      const tokenPrices = data?.data?.attributes?.token_prices;

      if (!tokenPrices) continue;

      Object.entries(tokens).forEach(([symbol, address]) => {
        const price = tokenPrices[address.toLowerCase()];
        if (!price) return;

        addToDBWritesList(
          writes,
          chain,
          address,
          price,
          18,
          symbol,
          timestamp,
          "harmonix-finance",
          confidence,
        );
      });
    } catch (e) {
      console.error("Failed to fetch prices for harmonix-finance", e);
    }
  }

  return writes;
}
