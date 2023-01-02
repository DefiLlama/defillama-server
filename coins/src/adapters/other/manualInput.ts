import getBlock from "../utils/block";
import { getTokenInfo } from "../utils/erc20";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";

interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
  redirect: string;
}
const contracts: { [chain: string]: TokenInfo[] } = {
  evmos: [
    {
      symbol: "axlDAI",
      address: "0x4a2a90d444dbb7163b5861b772f882bba394ca67",
      decimals: 18,
      redirect: "coingecko#dai"
    },
    {
      symbol: "axlUSDC",
      address: "0x15c3eb3b621d1bff62cba1c9536b7c1ae9149b57",
      decimals: 6,
      redirect: "coingecko#usd-coin"
    },
    {
      symbol: "axlUSDT",
      address: "0xe01c6d4987fc8dce22988dada92d56da701d0fe0",
      decimals: 6,
      redirect: "coingecko#tether"
    },
    {
      symbol: "ceDAI",
      address: "0x940daaba3f713abfabd79cdd991466fe698cbe54",
      decimals: 18,
      redirect: "coingecko#dai"
    },
    {
      symbol: "ibc G-DAI",
      address: "0xd567b3d7b8fe3c79a1ad8da978812cfc4fa05e75",
      decimals: 18,
      redirect: "coingecko#dai"
    },
    {
      symbol: "ibc G-USDC",
      address: "0x5fd55a1b9fc24967c4db09c513c3ba0dfa7ff687",
      decimals: 6,
      redirect: "coingecko#usd-coin"
    },
    {
      symbol: "ibc G-USDT",
      address: "0xeceeefcee421d8062ef8d6b4d814efe4dc898265",
      decimals: 6,
      redirect: "coingecko#tether"
    }
  ],
  arbitrum: [
    {
      symbol: "mUMAMI",
      address: "0x2adabd6e8ce3e82f52d9998a7f64a90d294a92a4",
      decimals: 9,
      redirect: "asset#arbitrum:0x1622bf67e6e5747b81866fe0b85178a93c7f86e3"
    }
  ]
};

export default async function getTokenPrices(chain: string, timestamp: number) {
  const writes: Write[] = [];

  Object.values(contracts[chain]).map((a: TokenInfo) => {
    addToDBWritesList(
      writes,
      chain,
      a.address,
      undefined,
      a.decimals,
      a.symbol,
      timestamp,
      "manual input",
      0.8,
      a.redirect
    );
  });

  return writes;
}
