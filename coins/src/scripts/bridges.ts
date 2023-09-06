import { sendMessage } from "../../../defi/src/utils/discord";
import { storeTokens } from "../adapters/bridges";
import { storeR2JSONString } from "../utils/r2";

async function bridges() {
  const bridgedTokens = await storeTokens();
  await storeR2JSONString(
    `bridgedTokens.json`,
    JSON.stringify(bridgedTokens),
    60 * 60,
  );
  await sendMessage(
    `coolifys just finished bridges`,
    process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
    true,
  );
  process.exit();
}
bridges(); // ts-node src/scripts/bridges.ts
