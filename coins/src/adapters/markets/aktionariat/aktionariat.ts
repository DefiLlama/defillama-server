import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { request, gql } from "graphql-request";

const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay));

async function fetchTokensFromSubgraph(subgraph: string, timestamp: number) {
  let tokens: any = [];
  let reservereThreshold: Number = 0;
  for (let i = 0; i < 20; i++) {
    const tkQuery = gql`
      query token {
        tokens(first: 1000, orderBy: tradeVolumeUSD, orderDirection: desc,
          where: {${`tradeVolumeUSD_gt: 0`}
          ${
            i == 0
              ? ``
              : `tradeVolumeUSD_lt: ${Number(reservereThreshold).toFixed(4)}`
          }
          ${
            timestamp == 0
              ? ``
              : `firstTradeTimestamp_lt: ${timestamp.toString()}`
          }
        }) {
          id
          tradeVolumeUSD
          symbol
          decimals
          derivedUSD
        }
      }`;
    const result: any = await request(subgraph, tkQuery);
    const tokensRes = result.tokens;
    if (tokensRes.length < 1000) i = 20;
    if (tokensRes.length == 0) return tokens;
    reservereThreshold =
      tokensRes[Math.max(tokensRes.length - 1, 0)].tradeVolumeUSD;
    tokens.push(...tokensRes);
    sleep(500);
  }
  return tokens;
}

export default async function getTokenPrices(
  chain: string,
  subgraph: string,
  timestamp: number,
  ignoreAddresses: string[], // ignore stablecoin addresses
) {
  let tokenInfos: any[];
  tokenInfos = await fetchTokensFromSubgraph(subgraph, timestamp);
  const writes: Write[] = [];
  tokenInfos.forEach((token: any) => {
    if (ignoreAddresses.includes(token.id)) return;
    addToDBWritesList(
      writes,
      chain,
      token.id,
      token.derivedUSD,
      token.decimals,
      token.symbol,
      timestamp,
      "aktionariat",
      1, //confidence 1 as aktionariat is the only official price source of this security token
    );
  });
  return writes;
}
