import { connection } from ".";
import { SwapEvent } from "./Models/SwapEvent";

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
  slippage,
  routePlace,
  route,
  realOutput,
  reportedOutput,
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
  event.slippage = slippage;
  event.routePlace = routePlace;
  event.route = route;
  event.realOutput = realOutput;
  event.reportedOutput = reportedOutput;

  const res = await (await connection).manager.save(event);
  return res;
};
