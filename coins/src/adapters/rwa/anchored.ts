import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { fetch } from "../utils";

const API_BASE_URL = 'https://rwa-api.anchored.finance/rwa/api/v1';
const addressRegex = /^0x[a-fA-F0-9]{40}$/;

async function fetchApiData(path: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (response?.code === 0 && response?.data) return response.data;
  throw new Error(`Invalid response from ${API_BASE_URL}${path}`);
}

export async function anchored(timestamp: number = 0): Promise<Write[]> {
  const [stockListData, marketInfoData] = await Promise.all([
    fetchApiData('/market/stocks'),
    fetchApiData('/market/stock/info'),
  ]);

  const stockList: any[] = stockListData?.list || [];
  const marketInfo: any[] = marketInfoData?.stocks || [];

  // Build symbol → price map from market data
  const priceMap = new Map<string, number>();
  for (const stock of marketInfo) {
    const symbol = String(stock?.symbol || '').trim().toUpperCase();
    const price = parseFloat(stock?.price);
    if (symbol && !isNaN(price) && price > 0) {
      priceMap.set(symbol, price);
    }
  }

  // Build contract → price object from stock list
  const pricesObject: any = {};
  for (const stock of stockList) {
    const contract = (stock?.contract || '').toLowerCase();
    const symbol = String(stock?.symbol || '').trim().toUpperCase();
    if (!addressRegex.test(contract) || !symbol) continue;
    const price = priceMap.get(symbol);
    if (!price) continue;
    pricesObject[contract] = { price };
  }

  return getWrites({ chain: 'monad', timestamp, pricesObject, projectName: 'anchored' });
}