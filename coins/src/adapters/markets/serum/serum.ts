import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import { request } from "graphql-request";
import axios from "axios";

interface GraphqlResponse {
  price: number;
  tokenMint: string;
}
interface TokenListResponse {
  decimals: number;
  symbol: string;
}

export default async function getTokenPrices(timestamp: number) {
  // since its API we cant get historical data!!!
  if (timestamp != 0) return [];
  const writes: Write[] = [];
  const [graphQlResponse, tokenListResponse] = await Promise.all([
    request(
      `https://api.vybenetwork.com/v1/graphql`,
      `query GetTokenStatsInTokensOverview {
        api_serum_dex_m {
          tokenStats {
            tokenMint
            price
          }}}`,
      undefined,
      {
        authorization: "74b8c3a1-85ce-44ef-82eb-09dc9d10eb5e"
      }
    ),
    axios.get("https://token-list-api.solana.cloud/v1/list")
  ]);

  const prices: GraphqlResponse[] = graphQlResponse.api_serum_dex_m.tokenStats;
  const metadata: TokenListResponse[] = tokenListResponse.data.content;

  prices.map((p: GraphqlResponse) => {
    const tokenMetaData = metadata.find(
      (m: any) => m.address == p.tokenMint
    );
    if (tokenMetaData == undefined) return;
    addToDBWritesList(
      writes,
      "solana",
      p.tokenMint,
      p.price,
      tokenMetaData.decimals,
      tokenMetaData.symbol,
      0,
      "serum",
      0.6
    );
  });

  return writes;
}
