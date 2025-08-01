import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import axios from "axios";

const baseTokens: { [symbol: string]: string } = {
  USDC: "usd-coin",
  SOL: "solana",
  JTO: "jito-governance-token",
  JLP: "jupiter-perpetuals-liquidity-provider-token",
  ETH: "ethereum",
  MXN: "real-mxn",
  "FLP.1": "flash-liquidity-token",
};

type MarketInfo = {
  address: string;
  mintAddress: string;
  symbol: string;
  decimals: number;
  unit: string;
  oracleDecimals: number;
  chain: string;
};

const marketInfos: MarketInfo[] = [
  {
    address: "6SbYW288Kje2WD6TRRcAmikhA76cijBi36y1wYt4RsdN",
    mintAddress: "2Pepgww4TndN5QsvodbyjVCjUEcmPnxzq5dqsbmdtQdT",
    symbol: "JLP",
    decimals: 6,
    unit: "JLP",
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "wwcj6seMTdkUxjTeqh7posUhwgqvJKh4Axi1ziajxJf",
    mintAddress: "4LJni8SefGqyHWEdk2W8uLWaVL5uA8pfE6MkYvmMmTfF",
    symbol: "cSOL",
    decimals: 6,
    unit: "SOL",
    oracleDecimals: 3,
    chain: "solana",
  },
  {
    address: "4TwkkaaDHyKhqDh59JYrYCGyRf9FRwDmGgvwwXyVzwYs",
    mintAddress: "EAsRTTRK2wjte4DecPYUjieTkakqFEYe9WD8z2mqvwS8",
    symbol: "cUSDC",
    decimals: 6,
    unit: "USDC",
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "9s19JHfKLMmw2b8yP6xdhE5jEqZYsJj6jL8SexAgLTeC",
    mintAddress: "D637bg2p2UqPrh3gsm9r2RrBnFezeUt5qspQuJyrBFaN",
    symbol: "cUSDC",
    decimals: 6,
    unit: "USDC",
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "B4mgGx4HHYMsWYv2dbJyNHtCNFx5dfUUt1EJYicEMNPp",
    mintAddress: "FVfGSJ6VGwpbfUEjpMs6rHE8mXaLrUi5ByPR66MsQqKs",
    symbol: "cUSDC",
    decimals: 6,
    unit: "USDC",
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "5ofpU1rU4ajg3LuHKSMBBWHDubTW1XF7x6tCAXsk5Gju",
    mintAddress: "9RSDq7sd7VZygdDAH4rRuL5dWWatJEMPe5pbwGSKKhr8",
    symbol: "JitoSOL",
    decimals: 9,
    unit: "SOL",
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "BSrrKn29jrEbag3QRyH7qy4pcMZ9mXEp9Sqfs9iW5fmK",
    mintAddress: "89dkr9ZhU3TGNzMKF7WbbuNBaqaGEgjtWsE33Vi3RBxY",
    symbol: "cPYUSD",
    decimals: 6,
    unit: "USDC",
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "Amu99crLdqbfpzrBbfrXHu1myWoCNXrSu7RRkHZJ1Ymv",
    mintAddress: "3Kwsdqgxp5c6yQQLVU3L6LC9LWThwvPr1urwc9UhqH2P",
    symbol: "mSOL",
    unit: "SOL",
    decimals: 9,
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "4K9VeqpZNCVHtZN9mKJpTihp4N8a9LeS35qBnqqM83Et",
    mintAddress: "FMDHLQDh9gWnnZQN9CYNViau7D9M4ggpFMqk8uybPttc",
    symbol: "bSOL",
    unit: "SOL",
    decimals: 9,
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "GLbDcuvEB2TLPQrAH6aG9tfRTkUeTHW9Nher2bsLVDu4",
    mintAddress: "5cPbK3BdrUVMUoe2wXppLH32tu5WFzW4cxjfLKsrF3yx",
    symbol: "kySOL",
    unit: "SOL",
    decimals: 9,
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "FaZ6MkHZxU9D8nbbT6FjzzeYC4bevQq3ZNnzmLQEZY8G",
    mintAddress: "5386v6tbgEMrA5sX5sLGYTEAjpZ5fsMaLDkBbxawnnqD",
    symbol: "lrtsSOL",
    unit: "SOL",
    decimals: 9,
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "7Rywj5jGRqHr4YHPPoMUUZ1MSZPQzUVrVvZVUiKxaWnj",
    mintAddress: "AM8LKTfzZ5KUxviB7faYh5kFdnJhWgGVoRrZpfmi37ms",
    symbol: "kyJTO",
    unit: "JTO",
    decimals: 9,
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "DAsYPZgVAgFikzHU2R55RGPtmjJ4ia5zLSzCAyXHzznE",
    mintAddress: "A8uPGauLyDTw9dMjBpb9Vrgq7frbWX46XqX71paW4pri",
    symbol: "tETH",
    unit: "ETH",
    decimals: 9,
    oracleDecimals: 0,
    chain: "eclipse",
  },
  {
    address: "GrzLxEjHk4suuE7EjZwsJpXwagpGVffQVPvGBCqat8tk",
    mintAddress: "B9XrZdPhbPi5FZXgpReHzDY5bkF18aRxtkgXzDmZz8uw",
    symbol: "CETES",
    unit: "MXN",
    decimals: 6,
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "8BTZiJ5G8SkB69bPtGfA2eiyYhkqbDhf8ryxovJFVnuJ",
    mintAddress: "EETKGUFiM5ihrtz4cCXZngMTyMxrk8WanUemDHX4BfVD",
    symbol: "fragSOL",
    unit: "SOL",
    decimals: 9,
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "8FriGWLJ1NGXdtm9ow4SoFGMcidKGs5s81yRCG3YjVw2",
    mintAddress: "9Mbo33isosQXQAg2VNTD4pobCDHtmFAkMwuUo3Vb11fh",
    symbol: "fragJTO",
    unit: "JTO",
    decimals: 9,
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "hzmYvfvU9LNc7eUVwRNFyDhQ1W3faXVpC8CAn76z3cj",
    mintAddress: "52EBWh8t1yHK5AA7RsKVaCU44YpgGsatbDSNPSbBpWUr",
    symbol: "CRT",
    unit: "USDC",
    decimals: 9,
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "CZnZHPw7fjHA54WHxvNdr1dNweceVT7HwYi4WWZ77N5y",
    mintAddress: "7sxrDsyfuEryDsHurLi4Fkd8RitkmbojQZFELfR1QcKQ",
    symbol: "FLP.1",
    unit: "FLP.1",
    decimals: 6,
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "EZcRjKu1TpXA1kozWxwAgJ9YpWdW74irMpWyN6cuVNmH",
    mintAddress: "6SK4WhZTD3fwpkYzE4oaGyqfPU9367MCWPYeNBLrrt1S",
    symbol: "kySOL",
    unit: "SOL",
    decimals: 9,
    oracleDecimals: 0,
    chain: "solana",
  },
  {
    address: "GpkBYWjccrT1e1T5TJKA15CmSeMNkbANvEfQUCnWGSn9",
    mintAddress: "EbSf4fhDBDw137wLxfjAitf4p6M43VmkpFk6AZGMJo5M",
    symbol: "kyJTO",
    unit: "JTO",
    decimals: 9,
    oracleDecimals: 0,
    chain: "solana",
  },
];

export async function sandglass(timestamp: number = 0): Promise<Write[]> {
  if (timestamp != 0) return [];
  const writes: Write[] = [];

  const { data: prices } = await axios.get(
    "https://api.sandglass.so/api/prices?mode=prod",
    {
      headers: {
        Origin: "https://sandglass.so",
      },
    }
  );

  const baseTokenPrices = await getTokenAndRedirectDataMap(
    Object.values(baseTokens),
    "coingecko",
    timestamp
  );

  marketInfos.map((marketInfo: MarketInfo) => {
    const marketAddress = marketInfo.address;
    const mintAddress = marketInfo.mintAddress;
    const oraclePrice = Number(
      prices.find((price: any) => price.address === marketAddress)?.price ?? "0"
    );

    const baseTokenInfo =
      baseTokenPrices[`coingecko#${baseTokens[marketInfo.unit]}`];
    if (!baseTokenInfo) return;

    const decimals = 10 ** marketInfo.oracleDecimals;
    const price =
      ((marketInfo.symbol !== "JLP" ? oraclePrice : 1) * baseTokenInfo.price) /
      decimals;

    addToDBWritesList(
      writes,
      marketInfo.chain,
      mintAddress,
      price,
      marketInfo.decimals,
      marketInfo.symbol,
      timestamp,
      "sandglass-api",
      0.5
    );
  });

  return writes;
}
