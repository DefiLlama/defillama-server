import storeChainAssets from "../l2";
import { sendMessage } from "./utils/discord";
import { withTimeout } from "./utils/shared/withTimeout";

export async function handler() {
  try {
    await withTimeout(8400000, storeChainAssets(true)); // 140 mins
  } catch (e) {
    process.env.CHAIN_ASSET_WEBHOOK ? await sendMessage(`${e}`, process.env.CHAIN_ASSET_WEBHOOK!) : console.log(e);
    process.exit();
  }
}

handler(); // ts-node defi/src/overrideChainAssets.ts
