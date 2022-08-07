import { wrapScheduledLambda } from "./utils/shared/wrap";
import { binResults } from "@defillama/adapters/liquidations/utils/binResults";
import adaptersModules from "./utils/imports/adapters_liquidations";
import { getCurrentUnixTimestamp } from "./utils/date";
import { liquidationsFilename, storeDataset } from "./utils/s3";

async function handler(){
  const time = getCurrentUnixTimestamp()
  const data = await Promise.all(Object.entries(adaptersModules).map(async ([protocol, module]) => {
    // too lazy to type this properly cuz issa already typed in adapters
    const liqs : {[chain: string]: object[]} = {}
    await Promise.all(Object.entries(module).map(async ([chain, liquidationsFunc])=> {
      const liquidations = await liquidationsFunc()
      liqs[chain] = liquidations
    }));

    return {
      protocol,
      liqs,
    }
  }))
  
  await storeDataset(liquidationsFilename, JSON.stringify({
    data,
    time
  }), "application/json");
  return;
}

export default wrapScheduledLambda(handler)