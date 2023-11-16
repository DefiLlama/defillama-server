import chainAssets from "../l2/tvl";
import { sendMessage } from "./utils/discord";
import { withTimeout } from "./utils/shared/withTimeout";
import setEnvSecrets from "./utils/shared/setEnvSecrets";
import { storeR2JSONString } from "./utils/r2";

async function getChainAssets() {
  const res = await chainAssets();
  await storeR2JSONString("chainAssets", JSON.stringify(res));
  console.log("chain assets stored");
}
export async function handler() {
  try {
    await setEnvSecrets();
    await withTimeout(840000, getChainAssets()); // 14 mins
  } catch (e) {
    process.env.CHAIN_ASSET_WEBHOOK ? await sendMessage(`${e}`, process.env.CHAIN_ASSET_WEBHOOK!) : console.log(e);
  }
}

handler(); // ts-node defi/src/storeChainAssets.ts
