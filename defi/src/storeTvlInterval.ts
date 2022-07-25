import storeTvls from "./storeTvlInterval/storeTvls";
import { wrapScheduledLambda } from "./utils/shared/wrap";

const handler = async (event: any, context:AWSLambda.Context) => {
  await storeTvls(event.protocolIndexes, context.getRemainingTimeInMillis);
};

export default wrapScheduledLambda(handler);
