import { wrapScheduledLambda } from "./utils/shared/wrap";
import invokeLambda from "./utils/shared/invokeLambda";

export const standaloneProtocols: string[] = ["venus"];

const handler = async () => {
  for (let protocol of standaloneProtocols) {
    const event = {
      protocol,
    };
    await invokeLambda(`defillama-prod-fetchLiquidations`, event);
  }
};

export default wrapScheduledLambda(handler);
