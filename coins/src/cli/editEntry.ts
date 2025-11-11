import { batchWrite, DELETE as deleteDDB } from "../utils/shared/dynamodb";
import { deleteRecords } from "../utils/coins3/es";
import { normalizeCoinId } from "../utils/coins3/utils";
import produce from "../utils/coins3/produce";

export async function deleteCoins(keys: { PK: string; SK: number }[]) {
  if (keys.length === 0) return;

  const esRecordsToDelete: { [index: string]: string[] } = {};
  keys.forEach(({ SK, PK }) => {
    const pid = normalizeCoinId(PK);
    if (SK === 0) {
      const index = "coins-metadata";
      if (!esRecordsToDelete[index]) esRecordsToDelete[index] = [];
      esRecordsToDelete[index].push(pid);
      return;
    }

    const date = new Date(SK * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const index = `coins-timeseries-${year}-${month}`;
    if (!esRecordsToDelete[index]) esRecordsToDelete[index] = [];
    esRecordsToDelete[index].push(`${pid}_${SK}`);
  });

  await Promise.all(
    Object.keys(esRecordsToDelete).map((index) =>
      deleteRecords(index, esRecordsToDelete[index])
    )
  );

  await deleteDDB(keys);
}

export async function updateCoins(items: any[]) {
  items.map((item) => {
    if (item.SK === 0 && item.symbol == undefined)
      throw new Error("Symbol is required for coins-metadata");
    if (item.price == undefined && !item.redirect)
      throw new Error("Price or redirect is required");
    if (item.adapter != "coingecko" && !item.decimals)
      throw new Error("Decimals are required for non-coingecko coins");
  });

  await produce(items);
  await batchWrite(items, true);
}
