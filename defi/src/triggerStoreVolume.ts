import { wrapScheduledLambda } from "./utils/shared/wrap";
// TODO pull dexVolumes from db
import volumeAdapters from "./dexVolumes/dexAdapters";
import invokeLambda from "./utils/shared/invokeLambda";

function shuffleArray(array: number[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const step = 10;
const handler = async () => {
  // TODO separate those that need to be called on the hour and those using graphs with timestamp
  const protocolIndexes = Array.from(Array(volumeAdapters.length).keys());
  shuffleArray(protocolIndexes);
  for (let i = 0; i < volumeAdapters.length; i += step) {
    const event = {
      protocolIndexes: protocolIndexes.slice(i, i + step),
    };
    await invokeLambda(`defillama-${process.env.stage}-storeVolume`, event);
  }
};

export default wrapScheduledLambda(handler);
