import { storeR2JSONString } from "./utils/r2";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import fetch from "node-fetch";
import sleep from "./utils/shared/sleep";

const CG_TOKEN_API = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=<PLACEHOLDER>&x_cg_pro_api_key=${process.env.CG_KEY}`;

async function cgRequest(url: string) {
  let data;
  for (let i = 0; i < 10; i++) {
    try {
      console.log(Date.now() / 1e3);
      data = await fetch(url).then((res) => res.json());
      await sleep(1200);
      if (data?.status?.error_code) {
        throw Error();
      }
      return data;
    } catch (e) {
      console.log(`error ${i}`);
      await sleep(1e3);
    }
  }
  console.log(data);
  throw Error(`Coingecko fails on "${url}"`);
}

const arrayFetcher = async (urlArr: string[]) => {
  const results = [];
  for (const url of urlArr) {
    let data = await cgRequest(url);
    results.push(data);
  }
  return results;
};

function getCGMarketsDataURLs() {
  const urls: string[] = [];
  const maxPage = 7;
  for (let page = 1; page <= maxPage; page++) {
    urls.push(`${CG_TOKEN_API.replace("<PLACEHOLDER>", `${page}`)}`);
  }
  return urls;
}

export async function getAllCGTokensList(): Promise<Array<{ name: string; symbol: string; image: string }>> {
  const data = await arrayFetcher(getCGMarketsDataURLs());

  return (
    data?.flat()?.map((t) => ({
      ...t,
      symbol: t.symbol === "mimatic" ? "mai" : t.symbol,
      image2: `https://icons.llamao.fi/icons/tokens/0/${t.name.toLowerCase()}?h=24&w=24`,
    })) ?? []
  );
}

const handler = async () => {
  const list = await getAllCGTokensList();
  await storeR2JSONString(`tokenlist/sorted.json`, JSON.stringify(list), 60 * 60);
};

export default wrapScheduledLambda(handler);
