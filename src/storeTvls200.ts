import storeTvls from "./storeTvlInterval/storeTvls";
import { wrapScheduledLambda } from "./utils/wrap";

const handler = async () => {
  await storeTvls(100, 400);
};

export default wrapScheduledLambda(handler);
