import chainAssetFlows from "../l2/flows";
import { sendMessage } from "./utils/discord";
import { withTimeout } from "./utils/shared/withTimeout";
import setEnvSecrets from "./utils/shared/setEnvSecrets";
import { getCurrentUnixTimestamp } from "./utils/date";
import { storeHistoricalFlows } from "../l2/storeToDb";
import { ChainTokens } from "../l2/types";

async function getChainAssetFlows() {
  const timestamp = getCurrentUnixTimestamp();
  const res: ChainTokens = await chainAssetFlows(timestamp);
  await storeHistoricalFlows(res, timestamp);
  console.log("chain asset flows stored");
  process.exit();
}
export async function handler() {
  try {
    await setEnvSecrets();
    await withTimeout(8400000, getChainAssetFlows()); // 140 mins
  } catch (e) {
    process.env.CHAIN_ASSET_WEBHOOK ? await sendMessage(`${e}`, process.env.CHAIN_ASSET_WEBHOOK!) : console.log(e);
    process.exit();
  }
}
handler();
