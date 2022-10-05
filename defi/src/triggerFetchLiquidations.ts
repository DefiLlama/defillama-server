import { wrapScheduledLambda } from "./utils/shared/wrap";
import invokeLambda from "./utils/shared/invokeLambda";

const handler = async () => {
  const protocols: string[] = ["venus"];
  for (let protocol in protocols) {
    const event = {
      protocol,
    };
    await invokeLambda(`defillama-prod-fetchLiquidations`, event);
  }
};

export default wrapScheduledLambda(handler);
