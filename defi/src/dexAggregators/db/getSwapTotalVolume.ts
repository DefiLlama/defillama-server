import { SwapEvent } from "./Models/SwapEvent";
import { connection } from ".";

export async function getSwapTotalVolume(): Promise<string> {
  const swapEventRepository = (await connection).getRepository(SwapEvent);

  const result = await swapEventRepository
    .createQueryBuilder("swapEvent")
    .select("SUM(swapEvent.amountUsd)", "totalUsdVolume")
    .where("swapEvent.isError = false")
    .getRawOne();
  return result ? result.totalUsdVolume : "0";
}

getSwapTotalVolume();
