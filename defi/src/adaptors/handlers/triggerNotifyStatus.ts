import { wrapScheduledLambda } from "../../utils/shared/wrap";
import invokeLambda from "../../utils/shared/invokeLambda";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";

export const handler = async () => {
  await Promise.all([
    AdapterType.FEES,
    AdapterType.DEXS,
    AdapterType.DERIVATIVES,
    AdapterType.AGGREGATORS,
    AdapterType.OPTIONS
  ].map(type => invokeLambda(`defillama-prod-notifyStatus`, { type })))
};

export default wrapScheduledLambda(handler);
