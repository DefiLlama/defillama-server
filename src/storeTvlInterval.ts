import storeTvls from "./storeTvlInterval/storeTvls";
import { wrapScheduledLambda } from "./utils/wrap";

const handler = async (event: any) => {
  await storeTvls(event.protocolIndexes);
};

export default wrapScheduledLambda(handler);
