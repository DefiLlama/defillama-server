import { getCurrentUnixTimestamp } from "../../utils/date";
import { chainIdMap } from "../bridges/celer";
import { fetch } from "../utils";
import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";

type PriceRes = {
  timestamp: number;
  primaryMarket: {
    price: number;
    symbol: string;
  };
};

type AddressRes = {
  symbol: string;
  addresses: {
    address: string;
    decimals: number;
    networkChainId: string;
  }[];
};

const margin = 3 * 24 * 60 * 60; // 3 days for weekend

export async function ondo_equity(timestamp: number): Promise<Write[]> {
  if (timestamp != 0) throw new Error("ondo_equity must run at timestamp = 0");
  const now = getCurrentUnixTimestamp();

  const [prices, addresses] = await Promise.all([
    fetch("https://api.gm.ondo.finance/v1/assets/all/prices/latest", {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ONDO_API_KEY,
      },
    }),
    fetch("https://api.gm.ondo.finance/v1/assets/all/addresses", {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ONDO_API_KEY,
      },
    }),
  ]);

  const pkMap: {
    [symbol: string]: {
      address: string;
      decimals: number;
      chain: string;
    }[];
  } = {};
  addresses.map(({ symbol, addresses }: AddressRes) => {
    pkMap[symbol] = [];
    return addresses.map(({ address, decimals, networkChainId }) => {
      const chainId: any = networkChainId.split("-")[1];
      const chain = chainIdMap[chainId];
      pkMap[symbol].push({
        address,
        decimals,
        chain,
      });
    });
  });

  const writes: Write[] = [];
  prices.map(({ timestamp, primaryMarket: { price, symbol } }: PriceRes) => {
    if (timestamp < now - margin) return;

    pkMap[symbol].map(({ address, decimals, chain }) => {
      addToDBWritesList(
        writes,
        chain,
        address,
        price,
        decimals,
        symbol,
        0,
        "ondo_equity",
        1,
      );
    });
  });

  return writes;
}
