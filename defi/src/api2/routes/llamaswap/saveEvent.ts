import * as HyperExpress from "hyper-express";

import { SwapEvent } from "../../../dexAggregators/db/Models/SwapEvent";
import { connection } from "../../db/llamaswap";
import { errorResponse, successResponse } from "../utils";

const saveEvent = async (req: HyperExpress.Request, res: HyperExpress.Response) => {
  try {
    const body = await req.json();
    const {
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
    } = body;
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

    const result = await connection.manager.save(event);
    console.log(result);
    return successResponse(res, result);
  } catch (e: any) {
    console.error(e);
    return errorResponse(res, e.message);
  }
};

export default saveEvent;
