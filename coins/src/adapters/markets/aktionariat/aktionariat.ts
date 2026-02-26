import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { request, gql } from "graphql-request";

interface SubgraphToken {
  id: string;
  symbol: string;
  decimals: number;
  priceUSD: string;
}

async function fetchTokensFromSubgraph(subgraph: string): Promise<SubgraphToken[]> {
  const query = gql`
    query tokens {
      tokens(first: 1000) {
        id
        symbol
        decimals
        priceUSD
      }
    }`;
  const result = await request<{ tokens: SubgraphToken[] }>(subgraph, query);
  return result.tokens;
}

export default async function getTokenPrices(chain: string, subgraph: string, timestamp: number): Promise<Write[]> {
  const tokenInfos = await fetchTokensFromSubgraph(subgraph);
  const writes: Write[] = [];
  tokenInfos.forEach((token) => {
    addToDBWritesList(
      writes,
      chain,
      token.id,
      Number(token.priceUSD),
      token.decimals,
      token.symbol,
      timestamp,
      "aktionariat",
      1, // confidence 1 as aktionariat is the only official price source of this security token
    );
  });

  return writes;
}
