import chainAssets from "../l2/tvl";
import { storeR2JSONString } from "../src/utils/r2";
import { getCurrentUnixTimestamp } from "../src/utils/date";
import storeHistorical from "../l2/storeToDb";
// import setEnvSecrets from "./utils/shared/setEnvSecrets";

export default async function storeChainAssets(override: boolean) {
  // await setEnvSecrets();
  const res: any = await chainAssets(override);
  res.timestamp = getCurrentUnixTimestamp();
  // let a = JSON.stringify(res);
  // let b = JSON.parse(a);
  await storeR2JSONString("chainAssets", JSON.stringify(res));
  await storeHistorical(res);
  console.log("chain assets stored");
  process.exit();
}
