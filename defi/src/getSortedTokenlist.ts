import fetch from "node-fetch";
import { successResponse, wrap, IResponse } from "./utils/shared";
import sleep from "./utils/shared/sleep";

const CG_TOKEN_API =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=<PLACEHOLDER>";

async function cgRequest(url:string){
  let data;
  for(let i=0; i<10; i++){
    try{
      console.log(Date.now()/1e3)
      data = await fetch(url).then((res) => res.json())
      await sleep(1200);
      if(data?.status?.error_code){
        throw Error()
      }
      return data
    } catch(e){
      console.log(`error ${i}`)
      await sleep(1e3)
    }
  }
  console.log(data)
  throw Error(`Coingecko fails on "${url}"`)
}

const arrayFetcher = async (urlArr: string[]) => {
  const results = []
  for(const url of urlArr){
    let data = await cgRequest(url)
    results.push(data);
  }
  return results
};

function getCGMarketsDataURLs() {
  const urls: string[] = [];
  const maxPage = 10;
  for (let page = 1; page <= maxPage; page++) {
    urls.push(`${CG_TOKEN_API.replace("<PLACEHOLDER>", `${page}`)}`);
  }
  return urls;
}

async function getAllCGTokensList(): Promise<Array<{ name: string; symbol: string; image: string }>> {
  const data = await arrayFetcher(getCGMarketsDataURLs());

  return (
    data?.flat()?.map((t) => ({
      ...t,
      symbol: t.symbol === "mimatic" ? "mai" : t.symbol,
      image2: `https://icons.llamao.fi/icons/tokens/0/${t.name.toLowerCase()}?h=24&w=24`,
    })) ?? []
  );
}

const handler = async (_event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const list = await getAllCGTokensList();
  return successResponse(list, 15 * 60);
};

export default wrap(handler);
