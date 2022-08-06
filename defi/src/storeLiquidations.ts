import { wrapScheduledLambda } from "./utils/shared/wrap";
import { binResults } from "@defillama/adapters/liquidations/utils/binResults";
import adaptersModules from "./utils/imports/adapters_liquidations";
import { getCurrentUnixTimestamp } from "./utils/date";
import { liquidationsFilename, storeDataset } from "./utils/s3";

async function handler(){
  const time = getCurrentUnixTimestamp()
  const data = await Promise.all(Object.entries(adaptersModules).map(async ([name, module]) => {
    const liqs = await module.ethereum.liquidations();
    const {bins} = await binResults(liqs)
    console.log("done", name)
    return {
      protocol: name,
      bins
    }
  }))
  
  await storeDataset(liquidationsFilename, JSON.stringify({
    data,
    time
  }), "application/json");
  return;
}

export default wrapScheduledLambda(handler)