import { SwapEvent } from "./Models/SwapEvent";
import { connection } from ".";
import { ILike } from "typeorm";

export async function getLatestSwap(tokenA: string, tokenB: string) {
  const swapEventRepository = (await connection).getRepository(SwapEvent);
  const trade = await swapEventRepository.findOne({
    where: {
      aggregator: "1inch",
      chain: "ethereum",
      isError: false,
      from: ILike(tokenA),
      to: ILike(tokenB),
    },
    order: {
      createdAt: "DESC",
    },
  });

  return trade;
}
