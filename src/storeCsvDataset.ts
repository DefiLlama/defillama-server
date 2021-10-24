import allProtocols from "./protocols/data";
import craftCsvDataset from './storeTvlUtils/craftCsvDataset'
import { wrapScheduledLambda } from "./utils/wrap";
import { store } from "./utils/s3";

const handler = async (_event: any) => {
  const csv = await craftCsvDataset(allProtocols, false);
  await store('all.csv', csv);
};

export default wrapScheduledLambda(handler);
