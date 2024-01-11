import { wrapScheduledLambda } from "./utils/shared/wrap";
import { notify } from "./storeTvlInterval/staleCoins";

const handler = async (_event: any) => await notify();

export default wrapScheduledLambda(handler);
