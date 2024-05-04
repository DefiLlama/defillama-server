import chainAssets from "../l2/tvl";
import { sendMessage } from "./utils/discord";
import { withTimeout } from "./utils/shared/withTimeout";
import setEnvSecrets from "./utils/shared/setEnvSecrets";
import { storeR2JSONString } from "./utils/r2";
import { getCurrentUnixTimestamp } from "./utils/date";
import storeHistorical from "../l2/storeToDb";

const chainMaps: { [chain: string]: string } = {
  avax: "avalanche",
  xdai: "gnosis",
  era: "zkSync Era",
  rsk: "rootstock",
  nova: "Arbitrum Nova",
  polygon_zkevm: "Polygon zkEVM",
  zklink: "zkLink Nova"
};
async function getChainAssets() {
  const res: any = await chainAssets();
  res.timestamp = getCurrentUnixTimestamp();
  Object.keys(chainMaps).map((key: string) => {
    if (key in res) res[chainMaps[key]] = res[key];
  });
  await storeR2JSONString("chainAssets", JSON.stringify(res));
  await storeHistorical(res);
  console.log("chain assets stored");
  process.exit();
}
export async function handler() {
  try {
    await setEnvSecrets();
    await withTimeout(8400000, getChainAssets()); // 140 mins
  } catch (e) {
    process.env.CHAIN_ASSET_WEBHOOK ? await sendMessage(`${e}`, process.env.CHAIN_ASSET_WEBHOOK!) : console.log(e);
    process.exit();
  }
}

handler(); // ts-node defi/src/storeChainAssets.ts
