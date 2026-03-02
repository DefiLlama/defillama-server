import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { request, gql } from "graphql-request";
import axios from "axios";

interface SubgraphToken {
  id: string;
  symbol: string;
  decimals: number;
  priceUSD: string;
}

interface TokenLiquidity {
  buyOrdersCount: number;
  totalBuyLiquidityDepth: number;
  sellOrdersCount: number;
  totalSellLiquidityDepth: number;
  totalPrimaryLiquidity: number;
  totalLiquidity: number;
}

interface LiquidityData {
  liquidityByTokenAddress: Record<string, TokenLiquidity>;
}

// Fetches all Aktionariat tokens with data from the subgraph.
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

// Filter out tokens that have lower than CHF 10'000 total liquidity at the current price. 
// The liquidity returned from the API is in CHF and in Rappen, i.e. 123.45 CHF is returned as 12345. 
// Therefore, the liquidity needed to be considered to have active trading is >= 1000000 
async function filterTokensByLiquidity(tokens: SubgraphToken[]): Promise<SubgraphToken[]> {
  const tokenAddresses = tokens.map((t) => t.id);
  const { data } = await axios.post<LiquidityData>("https://ext.aktionariat.com/defillama/getLiquidity", { tokenAddresses });
  return tokens.filter((t) => {
    const liquidity = data.liquidityByTokenAddress[t.id];
    return liquidity && liquidity.totalLiquidity >= 1000000; 
  });
}

// Simply fetch tokens, filter them by liquidity and add relevant tokens to the DB Writes.
export default async function getTokenPrices(chain: string, subgraph: string, timestamp: number): Promise<Write[]> {
  const allTokens = await fetchTokensFromSubgraph(subgraph);
  const tokenInfos = await filterTokensByLiquidity(allTokens);
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
