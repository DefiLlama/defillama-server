import AppDataSource from ".";
import { SwapEvent } from "./Models/SwapEvent";

export const saveEvent = async ({ user, aggregator, isError, chain, from, to, quote, txUrl, amount }: SwapEvent) => {
  const connection = await AppDataSource.initialize();

  const event = new SwapEvent();
  event.aggregator = aggregator;
  event.user = user;
  event.isError = isError;
  event.chain = chain;
  event.from = from;
  event.to = to;
  event.quote = quote;
  event.txUrl = txUrl;
  event.amount = amount;

  const res = await connection.manager.save(event);
  return res;
};
