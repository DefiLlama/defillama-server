import { fetchFlows, fetchHistoricalFlows, fetchHistoricalFromDB } from "../l2/storeToDb";
import { secondsInDay } from "./utils/date";

export async function chainAssetFlows() {
  return await fetchFlows(secondsInDay);
}

export async function chainAssetHistoricalFlows(pathParameters: { [key: string]: string }) {
  const chain = pathParameters?.chain;
  if (!chain) throw new Error(`chain path param required`);
  return await fetchHistoricalFlows(secondsInDay, chain);
}

export async function chainAssetChart(pathParameters: { [key: string]: string }) {
    const chainParam = pathParameters?.chain;
    if (!chainParam) throw new Error(`chain path param required`);
    const chain = chainParam.replace("%20", " ");
    return await fetchHistoricalFromDB(chain);
}