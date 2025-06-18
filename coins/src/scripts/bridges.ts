import { storeTokens } from "../adapters/bridges";
import { storeR2JSONString } from "../utils/r2";

async function bridges() {
  process.env.tableName = "prod-coins-table";
  const bridgedTokens = await storeTokens();
  const allSlasherTokens = bridgedTokens.flat();
  // await storeR2JSONString(
  //   `bridgedTokens.json`,
  //   JSON.stringify(bridgedTokens),
  //   60 * 60,
  // );
  process.exit();
}
bridges(); // ts-node coins/src/scripts/bridges.ts
