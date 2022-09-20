import { getCurrentUnixTimestamp } from "../date";
import { batchWrite } from "./dynamodb";

export async function findMissingCoins(pks: string[], fetchedCoins: any[]) {
  const missingCoins: any[] = [];
  pks.map((p: string) => {
    const resultsOfThisKind = fetchedCoins.filter((f: any) => f.PK.includes(p));
    if (resultsOfThisKind.length == 0) {
      missingCoins.push({ PK: p, SK: getCurrentUnixTimestamp() });
    }
  });
  batchWrite(missingCoins, true, "dev-missin-coins-table");
}
