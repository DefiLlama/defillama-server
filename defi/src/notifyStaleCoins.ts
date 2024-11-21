import { wrapScheduledLambda } from "./utils/shared/wrap";
import {
  notifyStaleCoins,
  notifyChangedAdapter,
} from "./storeTvlInterval/staleCoins";
import setEnvSecrets from "./utils/shared/setEnvSecrets";

const handler = async (_event: any) => {
  await setEnvSecrets()
  await Promise.all([notifyStaleCoins(), notifyChangedAdapter()]);
};

export default wrapScheduledLambda(handler);
