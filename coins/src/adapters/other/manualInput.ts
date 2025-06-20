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
      redirect: "coingecko#dai",
    },
    {
      symbol: "axlUSDC",
      address: "0x15c3eb3b621d1bff62cba1c9536b7c1ae9149b57",
      decimals: 6,
      redirect: "coingecko#usd-coin",
    },
    {
      symbol: "axlUSDT",
      address: "0xe01c6d4987fc8dce22988dada92d56da701d0fe0",
      decimals: 6,
      redirect: "coingecko#tether",
    },
    {
      symbol: "ceDAI",
      address: "0x940daaba3f713abfabd79cdd991466fe698cbe54",
      decimals: 18,
      redirect: "coingecko#dai",
    },
    {
      symbol: "ibc G-DAI",
      address: "0xd567b3d7b8fe3c79a1ad8da978812cfc4fa05e75",
      decimals: 18,
      redirect: "coingecko#dai",
    },
    {
      symbol: "ibc G-USDC",
      address: "0x5fd55a1b9fc24967c4db09c513c3ba0dfa7ff687",
      decimals: 6,
      redirect: "coingecko#usd-coin",
    },
    {
      symbol: "ibc G-USDT",
      address: "0xeceeefcee421d8062ef8d6b4d814efe4dc898265",
      decimals: 6,
      redirect: "coingecko#tether",
    },
  ],
  arbitrum: [
    {
      symbol: "mUMAMI",
      address: "0x2adabd6e8ce3e82f52d9998a7f64a90d294a92a4",
      decimals: 9,
      redirect: "coingecko#umami-finance",
    },
    {
      symbol: "fsGLP",
      address: "0x1aDDD80E6039594eE970E5872D247bf0414C8903",
      decimals: 18,
      redirect: "asset#arbitrum:0x4277f8f2c384827b5273592ff7cebd9f2c1ac258",
    },
    {
      symbol: "fGLP",
      address: "0x4e971a87900b931fF39d1Aad67697F49835400b6",
      decimals: 18,
      redirect: "asset#arbitrum:0x4277f8f2c384827b5273592ff7cebd9f2c1ac258",
    },
    {
      symbol: "OLE",
      address: "0xd4d026322c88c2d49942a75dff920fcfbc5614c1",
      decimals: 18,
      redirect: "coingecko#openleverage",
    },
  ],
  polygon_zkevm: [
    {
      symbol: "wstETH",
      address: "0x5D8cfF95D7A57c0BF50B30b43c7CC0D52825D4a9",
      decimals: 18,
      redirect: "coingecko#wrapped-steth",
    },
    {
      symbol: "USDC",
      address: "0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035",
      decimals: 6,
      redirect: "coingecko#usd-coin",
    },
    {
      symbol: "USDT",
      address: "0x1E4a5963aBFD975d8c9021ce480b42188849D41d",
      decimals: 6,
      redirect: "coingecko#tether",
    },
    {
      symbol: "MATIC",
      address: "0xa2036f0538221a77A3937F1379699f44945018d0",
      decimals: 18,
      redirect: "coingecko#matic-network",
    },
  ],
  polygon: [
    {
      symbol: "wstETH",
      address: "0x03b54a6e9a984069379fae1a4fc4dbae93b3bccd",
      decimals: 18,
      redirect: "coingecko#wrapped-steth",
    },
  ],
  wemix: [
    {
      symbol: "WEMIX$",
      address: "0x8e81fcc2d4a3baa0ee9044e0d7e36f59c9bba9c1",
      decimals: 18,
      redirect: "coingecko#usd-coin",
    },
  ],
  kava: [
    {
      symbol: "DEXI",
      address: "0xd22a58f79e9481d1a88e00c343885a588b34b68b",
      decimals: 9,
      redirect: "coingecko#dexioprotocol-v2",
    },
    {
      symbol: "ATOM",
      address: "0x15932e26f5bd4923d46a2b205191c4b5d5f43fe3",
      decimals: 6,
      redirect: "coingecko#cosmos",
    },
    {
      symbol: "WKAVA",
      address: "0xc86c7c0efbd6a49b35e8714c5f59d99de09a225b",
      decimals: 18,
      redirect: "coingecko#kava",
    },
  ],
  ethereum: [
    {
      symbol: "sdXAIFRAXBP3CRV-f-vault",
      address: "0xd4ed44aa0ac185ad3024f5433442d9aef4b39ed8",
      decimals: 18,
      redirect: "asset#ethereum:0x326290a1b0004eee78fa6ed4f1d8f4b2523ab669",
    },
    {
      symbol: "sdXAIFRAXBP3CRV-f-gauge",
      address: "0x4b95f9f85857341cc2876c15c88091a04ee5cb31",
      decimals: 18,
      redirect: "asset#ethereum:0x326290a1b0004eee78fa6ed4f1d8f4b2523ab669",
    },
    {
      symbol: "eETH",
      address: "0x35fA164735182de50811E8e2E824cFb9B6118ac2",
      decimals: 18,
      redirect: "coingecko#ethereum",
    },
    {
      symbol: "GHO",
      address: "0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f",
      decimals: 18,
      redirect: "coingecko#gho",
    },
  ],
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
      1.01,
      a.redirect,
    );
  });

  return writes;
}
