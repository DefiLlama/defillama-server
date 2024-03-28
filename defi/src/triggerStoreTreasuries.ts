import { wrapScheduledLambda } from "./utils/shared/wrap";
import invokeLambda from "./utils/shared/invokeLambda";
import { treasuriesAndEntities } from "./protocols/entities";
import { shuffleArray } from "./utils/shared/shuffleArray";

const step = 40;
const handler = async () => {
  const protocolIndexes = Array.from(Array(treasuriesAndEntities.length).keys());
  shuffleArray(protocolIndexes);
  for (let i = 0; i < treasuriesAndEntities.length; i += step) {
    const event = {
      protocolIndexes: protocolIndexes.slice(i, i+step)
    };
    await invokeLambda(`defillama-prod-storeTreasuryInterval`, event);
  }
};

export default wrapScheduledLambda(handler);
