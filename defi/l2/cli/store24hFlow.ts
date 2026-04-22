import { quantisePeriod } from "../utils";
import { fetchFlows } from "../storeToDb";
import * as sdk from "@defillama/sdk";

const store24hFlow = async () => {
  const quantisedPeriod = quantisePeriod('24h');
  const data = await fetchFlows(quantisedPeriod);
  return sdk.cache.writeCache("chain-assets/flows/24h", data)
}

store24hFlow().then(() => {
  console.log("24h flows stored successfully");
  process.exit(0);
}).catch((e) => {
  console.error("Error storing 24h flows:", e);
  process.exit(1);
});