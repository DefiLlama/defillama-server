import { wrapScheduledLambda } from "./utils/shared/wrap";
import {
  notifyStaleCoins,
  notifyChangedAdapter,
} from "./storeTvlInterval/staleCoins";

const handler = async (_event: any) => {
  await Promise.all([notifyStaleCoins(), notifyChangedAdapter()]);
};

export default wrapScheduledLambda(handler);
