import { SwapEvent } from "./Models/SwapEvent";
import { getConnection } from ".";

export async function getSwapDailyVolume(date: string, chain: string): Promise<string> {
  const swapEventRepository = (await getConnection()).getRepository(SwapEvent);
  const startOfDay = new Date(+date * 1000);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(+date * 1000);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await swapEventRepository
    .createQueryBuilder("swapEvent")
    .select("SUM(swapEvent.amountUsd)", "totalUsdVolume")
    .where("swapEvent.createdAt BETWEEN :startOfDay AND :endOfDay", {
      startOfDay,
      endOfDay,
    })
    .andWhere("swapEvent.isError = false")
    .andWhere(`swapEvent.chain = '${chain}'`)
    .getRawOne();

  return result ? result.totalUsdVolume : "0";
}
