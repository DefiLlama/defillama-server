import { wrapScheduledLambda } from "./utils/wrap";
import protocols from './protocols/data'
import invokeLambda from './utils/invokeLambda'

const step = 25;
const handler = async () => {
  for (let i = 0; i < protocols.length; i += step) {
    const event = {
      first: i,
      last: i + step
    }
    await invokeLambda(`defillama-prod-storeTvlInterval`, event);
  }
};

export default wrapScheduledLambda(handler);
