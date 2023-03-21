import { SwapEvent } from "./Models/SwapEvent";
import { connection } from ".";

export async function getHistory(userId: string, chain: string): Promise<SwapEvent[]> {
  const swapEventRepository = (await connection).getRepository(SwapEvent);
  const transactionHistory = await swapEventRepository
    .createQueryBuilder("swapEvent")
    .select([
      "swapEvent.id",
      "swapEvent.createdAt",
      "swapEvent.user",
      "swapEvent.aggregator",
      "swapEvent.isError",
      "swapEvent.chain",
      "swapEvent.from",
      "swapEvent.to",
      "swapEvent.txUrl",
      "swapEvent.amount",
      "swapEvent.amountUsd",
      "swapEvent.slippage",
      "swapEvent.route",
    ])
    .where("swapEvent.user = :userId", { userId })
    .andWhere("swapEvent.chain = :chain", { chain })
    .andWhere("swapEvent.isError = false")
    .orderBy("swapEvent.id", "DESC")
    .take(30)
    .getMany();

  return transactionHistory;
}
