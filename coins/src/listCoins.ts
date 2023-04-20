import { DocumentClient } from "aws-sdk/clients/dynamodb";
import fs from "fs";
import path from "path";
import { getCurrentUnixTimestamp } from "./utils/date";
const file = path.resolve(__dirname, "./coinRepository.json");

export async function storePks(
  results: DocumentClient.PutItemInputAttributeMap[]
) {
  let repo = JSON.parse(fs.readFileSync(file).toString());
  results
    .filter((r: any) => r.SK != 0)
    .map((r: any) => {
      repo[r.PK] = r.SK;
    });
  fs.writeFileSync(file, JSON.stringify(repo));
}

export async function checkOutdated(hours: number = 2) {
  const timeNow = getCurrentUnixTimestamp();
  const repo = JSON.parse(fs.readFileSync(file).toString());
  let outDatedList: string[] = [];
  Object.entries(repo).map((c: any) => {
    if (c[1] < timeNow - 3600 * hours) {
      outDatedList.push(`${c[0]} since ${c[1]}`);
    }
  });
  console.log(outDatedList);
}
