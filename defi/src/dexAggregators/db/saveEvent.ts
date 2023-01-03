import AppDataSource from ".";
import { SwapEvent } from "./Models/SwapEvent";

const connection = await AppDataSource.initialize();

export const saveEvent = async ({
  user,
  aggregator,
  isError,
  chain,
  from,
  to,
  quote,
  txUrl,
  amount,
  errorData,
  amountUsd,
}: SwapEvent) => {
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
  event.errorData = errorData;
  event.amountUsd = amountUsd;

  const res = await connection.manager.save(event);
  return res;
};
