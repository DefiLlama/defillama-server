import { CoinData, ReadableDeposit } from "./depositedContracts/types";
import { fetchPrices, fetchTransfers, filterDeposits, parseDeposits } from "./depositedContracts/helpers";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import setEnvSecrets from "./utils/shared/setEnvSecrets";

const handler = async (event: any): Promise<IResponse> => {
  // if (!event.pathParameters) throw new Error("please supply at least one wallet address");

  // const { addresses, threshold } = event.pathParameters;
  const addresses = event.pathParameters?.addresses;
  const threshold = event.pathParameters?.threshold;
  if (!addresses) throw new Error("please supply at least one wallet address");
  if (threshold && isNaN(Number(threshold))) throw new Error("threshold must be a number or undefined");

  try {
    await setEnvSecrets();
    console.time("total");
    const noramlisedAddresses = addresses.toLowerCase();

    console.time("transfers");
    const allTransfers: { [chain: string]: any[] } = await fetchTransfers(noramlisedAddresses);
    console.timeEnd("transfers");

    const deposits = await filterDeposits(allTransfers, noramlisedAddresses.split(","));
    const coinsData: { [key: string]: CoinData } = await fetchPrices(deposits);
    const userData: ReadableDeposit[] = parseDeposits(deposits, coinsData, Number(threshold));
    console.timeEnd("total");

    return successResponse({ data: userData }, 3600);
  } catch (e: any) {
    return errorResponse({
      message: e.message,
    });
  }
};

export default wrap(handler); // ts-node defi/src/getDepositedContracts.ts
