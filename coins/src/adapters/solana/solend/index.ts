import fetch from "node-fetch";
import { CoinData, Write } from "../../utils/dbInterfaces";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";

type Market = {
  reserves: {
    liquidityToken: {
      token2022Mint: any;
      mint: any;
    };
  }[];
};

const endpoint =
  "https://api.solend.fi/v1/markets/configs?scope=all&deployment=production";
const chain = "solana";

export async function solend(timestamp: number) {
  const markets: Market[] = await fetch(endpoint).then((r) => r.json());
  const tokenConversions: { [a: string]: string } = {};

  for (const market of markets) {
    for (const reserve of market.reserves) {
      if (reserve.liquidityToken.token2022Mint) {
        tokenConversions[reserve.liquidityToken.token2022Mint] =
          reserve.liquidityToken.mint;
      }
    }
  }

  const reads: CoinData[] = await getTokenAndRedirectData(
    Object.keys(tokenConversions),
    chain,
    timestamp,
  );

  const writes: Write[] = [];
  reads.map((r: CoinData) => {
    addToDBWritesList(
      writes,
      chain,
      tokenConversions[r.address],
      undefined,
      r.decimals,
      r.symbol,
      timestamp,
      "solend 2022",
      r.confidence ?? 0.7,
      r.redirect ?? `asset#solana:${r.address}`,
    );
  });

  return writes;
}
