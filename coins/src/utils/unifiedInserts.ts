import { batchWrite } from "../utils/shared/dynamodb";
import produce from "../utils/coins3/produce";
import { Topic } from "../utils/coins3/jsonValidation";
import { getBasicCoins } from "./getCoinsUtils";
import { zeroDecimalAdapters } from "../../coins2";

export async function insertCoins(
  items: any[],
  options: { topics?: Topic[]; failOnError?: boolean } = {}
) {
  const { topics, failOnError } = options;
  items.map((item) => {
    if (item.SK === 0 && item.symbol == undefined)
      throw new Error("Symbol is required for coins-metadata");
    if (item.price == undefined && !item.redirect)
      throw new Error("Price or redirect is required");
    if (item.SK == 0 && !zeroDecimalAdapters.includes(item.adapter) && !item.decimals)
      throw new Error("Decimals are required for non-coingecko coins");
  });

  const { coins } = await getBasicCoins(items.map((item) => item.PK));
  coins.forEach((coin) => {
    if (coin.distressedFrom) {
      const item = items.find((item) => item.PK == coin.PK);
      if (!item) throw new Error("Item not found");
      item.distressedFrom = coin.distressedFrom;
    }
  });

  await produce(items, topics);
  await batchWrite(
    items.map((item) => {
      if (item.adapter && item.SK != 0) return { ...item, adapter: undefined };
      return item;
    }),
    failOnError ?? true
  );
}
