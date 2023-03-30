import allProtocols from "./protocols/data";
import craftCsvDataset from './storeTvlUtils/craftCsvDataset'
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { store } from "./utils/s3";
import { storeR2 } from "./utils/r2";

const handler = async (_event: any) => {
  const csv = await craftCsvDataset(allProtocols, false, true);
  await storeR2('all.csv', csv);
  await store('all.csv', csv);
};

export default wrapScheduledLambda(handler);
