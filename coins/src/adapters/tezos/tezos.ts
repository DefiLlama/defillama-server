import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import axios from "axios";

export default async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];

  const res = (await Promise.all([getPlentyData(), getTezToolsData()])).flat();
  res.forEach((i: any) => {
    if (!i.token) return; // ignore xtz token
    addToDBWritesList(
      writes,
      "tezos",
      i.token,
      i.price,
      i.decimals,
      i.symbol,
      timestamp,
      "tezos",
      i.confidence,
    );
  });
  return writes;
}

async function getPlentyData() {
  const response: any = [];

  let data: any = {};
  try {
    data = (
      await axios.get("https://api.analytics.plenty.network/analytics/tokens")
    ).data;
  } catch {
    return response;
  }
  data.forEach((i: any) => {
    const { token, decimals } = i;
    const tvl = +i.tvl.value;
    if (tvl < 1000) return;
    const confidence = tvl > 10000 ? 0.98 : 0.6;
    let label = i.contract;
    if ([token, label, decimals, +i.price.value].includes(undefined)) return;
    if (i.hasOwnProperty("tokenId") && i.tokenId !== 0)
      label += "-" + i.tokenId;
    response.push({
      symbol: token,
      token: label,
      decimals,
      price: +i.price.value,
      confidence,
    });
  });

  return response;
}

async function getTezToolsData() {
  const response: any = [];
  let data: any = {};
  try {
    data = (await axios.get("https://api.teztools.io/v1/prices")).data;
  } catch {
    return response;
  }
  data.contracts.forEach((i: any) => {
    const { symbol, decimals, pairs } = i;
    const tvl = pairs.reduce((a: number, j: any) => a + +j.tvl, 0);
    if (tvl < 1000) {
      // console.log('Ignoring', symbol, ' tvl is only', tvl)
      return;
    }
    const confidence = tvl > 10000 ? 0.98 : 0.6;
    let label = i.tokenAddress;
    if (i.hasOwnProperty("tokenId") && i.tokenId !== 0)
      label += "-" + i.tokenId;
    response.push({
      symbol,
      token: label,
      decimals,
      price: i.usdValue,
      confidence,
    });
  });
  return response;
}
