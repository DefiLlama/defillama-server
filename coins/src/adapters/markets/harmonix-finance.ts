import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";

const config: { [chain: string]: { [symbol: string]: string } } = {
  hyperliquid: {
    HAR: "0x391121d817da42ed3434d281aedbbcc416a2af18",
  },
};

export function harmonix(timestamp: number) {
  const writes: Write[] = [];
  const confidence = 0.9;

  Object.keys(config).forEach((chain) => {
    Object.entries(config[chain]).forEach(([symbol, address]) => {
      addToDBWritesList(
        writes,
        chain,
        address,
        undefined,
        18,
        symbol,
        timestamp,
        "harmonix-finance",
        confidence,
        "coingecko#harmonix-finance",
      );
    });
  });

  return Promise.resolve(writes);
}