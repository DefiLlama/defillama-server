import { SwapEvent } from "./Models/SwapEvent";
import { getConnection } from ".";

export async function getSwapTotalVolume(date: string, chain: string): Promise<string> {
  const swapEventRepository = (await getConnection()).getRepository(SwapEvent);

  const result = await swapEventRepository
    .createQueryBuilder("swapEvent")
    .select("SUM(swapEvent.amountUsd)", "totalUsdVolume")
    .where("swapEvent.isError = false")
    .andWhere("swapEvent.createdAt <= TO_TIMESTAMP(:date)", { date })
    .andWhere(`swapEvent.chain = '${chain}'`)
    .getRawOne();

  return result ? result.totalUsdVolume : "0";
}
