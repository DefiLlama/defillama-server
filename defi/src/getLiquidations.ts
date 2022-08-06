import { wrap, IResponse, successResponse } from "./utils/shared";
import { binResults } from "@defillama/adapters/liquidations/utils/binResults";
import adaptersModules from "./utils/imports/adapters_liquidations";
import { getCurrentUnixTimestamp } from "./utils/date";
import { buildRedirect, storeDataset } from "./utils/s3";

const filename = `liquidations.json`;

// relies on the fact that lambda waits for all projects to shut down
async function updateData(){
  const now = getCurrentUnixTimestamp()
  const data = await Promise.all(Object.entries(adaptersModules).map(async ([name, module]) => {
    const liqs = await module.ethereum.liquidations();
    const {bins} = await binResults(liqs)
    console.log("done", name)
    return {
      protocol: name,
      bins
    }
  }))
  
  await storeDataset(filename, JSON.stringify(data), "application/json");
}

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  updateData();
  return buildRedirect(filename, 5 * 60); // 5 mins
};

export default wrap(handler);
