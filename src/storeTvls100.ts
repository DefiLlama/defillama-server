import storeTvls from "./storeTvlInterval/storeTvls";
import { wrapScheduledLambda } from "./utils/wrap";

const handler = async () => {
  await storeTvls(0, 100);
};

export default wrapScheduledLambda(handler);
