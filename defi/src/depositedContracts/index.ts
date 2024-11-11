import { CoinData, ReadableDeposit } from "./types";
import { fetchPrices, fetchTransfers, filterDeposits, parseDeposits } from "./helpers";

async function main(csv: string, threshold: number = 1) {
  const addresses = csv.toLowerCase();
  const allTransfers: { [chain: string]: any[] } = await fetchTransfers(addresses);
  const deposits = await filterDeposits(allTransfers, addresses.split(","));
  const coinsData: { [key: string]: CoinData } = await fetchPrices(deposits);
  const userData: ReadableDeposit[] = parseDeposits(deposits, coinsData, threshold);
  return userData;
}
