import { wrapScheduledLambda } from "./utils/shared/wrap";
import { notifyStaleCoins } from "./storeTvlInterval/staleCoins";
import { notifyChangedAdapter } from "../../coins/coins2";

const handler = async (_event: any) => {
  await Promise.all([notifyStaleCoins(), notifyChangedAdapter()]);
};

export default wrapScheduledLambda(handler);
