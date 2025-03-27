import { humanizeNumber } from "@defillama/sdk/build/computeTVL/humanizeNumber";
import { hourlyRawTokensTvl, hourlyTokensTvl, hourlyTvl, hourlyUsdTokensTvl } from "../utils/getLastRecord";
import { getProtocol } from "./utils";
import inquirer from 'inquirer';
import dynamodb from "../utils/shared/dynamodb";
import { getCurrentUnixTimestamp } from "../utils/date";
import getTVLOfRecordClosestToTimestamp from "../utils/shared/getRecordClosestToTimestamp";

// AWS_REGION='eu-central-1' tableName='prod-table' npx ts-node src/cli/displayLastData.ts makerdao

async function main() {
    const id = getProtocol(process.argv[2]).id
    const now = getCurrentUnixTimestamp()
    const data = await dynamodb.query({
        ExpressionAttributeValues: {
          ":pk": hourlyTvl(id),
          ":from": now - 24*3600,
        },
        KeyConditionExpression: "PK = :pk AND SK > :from",
      });
    const timestamp = (await inquirer
      .prompt([
          {
            name: "time?",
            type: "list",
            choices:data.Items?.map(v=>({
                name: `${((now - v.SK)/3600).toFixed(2)} hours ago - TVL ${humanizeNumber(v.tvl)}`,
                value: v.SK
            }))
          }
      ]))['time?']
    const chain = (await inquirer
      .prompt([
          {
            name: "chain?",
            type: "list",
            choices:Object.entries(data.Items?.find(t=>t.SK===timestamp)!)?.map(v=>({
                name: `${v[0]} - ${humanizeNumber(v[1])}`,
                value: v[0]
            }))
          }
      ]))["chain?"].toLowerCase()
    console.log(chain)
    const [tvl, usd, tokens, raw] = await Promise.all([hourlyTvl, hourlyUsdTokensTvl, hourlyTokensTvl, hourlyRawTokensTvl].map(func => getTVLOfRecordClosestToTimestamp(func(id), timestamp, 3600*1.5)))
    console.log("TVL", humanizeNumber(tvl![chain]))
    console.log("USD tokens")
    console.table(Object.entries(usd![chain]).sort((a:any,b:any)=>b[1]-a[1]!).map(v=>({
        Token: v[0],
        "Value (USD)": humanizeNumber(Number(v[1]))
    })))
    console.log("Tokens")
    console.table(Object.entries(tokens![chain]).sort((a:any,b:any)=>b[1]-a[1]!).map(v=>({
        Token: v[0],
        "Amount": humanizeNumber(Number(v[1]))
    })))
    console.log("Raw")
    console.table(Object.entries(raw![chain]).map(v=>({
        Token: v[0],
        "Amount": humanizeNumber(Number(v[1]))
    })))
}
main()