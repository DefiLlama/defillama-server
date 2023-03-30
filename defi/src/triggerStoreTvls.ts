import { wrapScheduledLambda } from "./utils/shared/wrap";
import protocols from "./protocols/data";
import invokeLambda from "./utils/shared/invokeLambda";
import { shuffleArray } from "./utils/shared/shuffleArray";

const step = 40;
const handler = async () => {
  const protocolIndexes = Array.from(Array(protocols.length).keys());
  shuffleArray(protocolIndexes);
  for (let i = 0; i < protocols.length; i += step) {
    const event = {
      protocolIndexes: protocolIndexes.slice(i, i+step)
    };
    await invokeLambda(`defillama-prod-storeTvlInterval`, event);
  }
};

export default wrapScheduledLambda(handler);
