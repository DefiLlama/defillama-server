import { Write } from "../../utils/dbInterfaces";
import { addToDBWritesList } from "../../utils/database";

interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
}

const ETHEREUM_TARGET = "0xfe0ccc9942e98c963fe6b4e5194eb6e3baa4cb64";
const REDIRECT = `asset#ethereum:${ETHEREUM_TARGET}`;

export const tokens: { [chain: string]: TokenInfo[] } = {
  bsc: [
    {
      symbol: "sYUSD",
      address: "0x85636BF94EA95c32e945b0db30A7CDc614F2691e",
      decimals: 18,
    },
  ],
  avax: [
    {
      symbol: "sYUSD",
      address: "0x539e46827c37A3ef11c7cE521CC56B4d59E602e3",
      decimals: 18,
    },
  ],
  katana: [
    {
      symbol: "sYUSD",
      address: "0xFCeF626dE4A0175ac962DD43EB0A002819FaAEFe",
      decimals: 18,
    },
  ],
  plasma: [
    {
      symbol: "sYUSD",
      address: "0xca2671Dcd031a72359f456C212F62A9bDa737cD7",
      decimals: 18,
    },
  ],
  hedera: [
    {
      symbol: "sYUSD",
      address: "0xc48Ea88272e723366e124d9fd2607216969382Ec",
      decimals: 18,
    },
  ],
};

export default async function getTokenPrices(
  chain: string,
  timestamp: number
): Promise<Write[]> {
  const writes: Write[] = [];
  const chainTokens = tokens[chain] || [];

  chainTokens.forEach((token: TokenInfo) => {
    addToDBWritesList(
      writes,
      chain,
      token.address,
      undefined,
      token.decimals,
      token.symbol,
      timestamp,
      "aegis",
      1.0,
      REDIRECT,
    );
  });

  return writes;
}

