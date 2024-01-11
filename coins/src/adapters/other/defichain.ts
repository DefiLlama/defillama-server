import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";

export default (timestamp: number) => {
  const writes: Write[] = [];
  const mapping: { [apiKey: string]: { cgId: string; symbol: string } } = {
    eth: { cgId: "ethereum", symbol: "ETH" },
    dfi: { cgId: "defichain", symbol: "DFI" },
    btc: { cgId: "bitcoin", symbol: "BTC" },
    usdt: { cgId: "tether", symbol: "USDT" },
    usdc: { cgId: "usd-coin", symbol: "USDC" },
    dusd: { cgId: "decentralized-usd", symbol: "DUSD" },
  };

  Object.keys(mapping).map((from: string) =>
    addToDBWritesList(
      writes,
      "defichain",
      from,
      undefined,
      0,
      mapping[from].symbol,
      timestamp,
      "defichain",
      1,
      `coingecko#${mapping[from].cgId}`,
    ),
  );

  return writes;
};
