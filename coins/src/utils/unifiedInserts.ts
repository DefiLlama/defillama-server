import { batchWrite } from "../utils/shared/dynamodb";
import produce from "../utils/coins3/produce";
import { Topic } from "../utils/coins3/jsonValidation";

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
    if (item.adapter != "coingecko" && !item.decimals)
      throw new Error("Decimals are required for non-coingecko coins");
  });

  await produce(items, topics);
  await batchWrite(items, failOnError ?? true);
}
