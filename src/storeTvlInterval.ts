import storeTvls from "./storeTvlInterval/storeTvls";
import { wrapScheduledLambda } from "./utils/wrap";

const handler = async (event:any) => {
  await storeTvls(event.first, event.last);
};

export default wrapScheduledLambda(handler);
