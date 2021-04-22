const db = require('../imported-db/defillama-db.json');
import { getClosestDayStartTimestamp } from "../date/getClosestDayStartTimestamp"
import { client, dateToUNIXTimestamp, dailyPrefix, TableName } from "./dynamodb"

const hourly = db[4].data;
const daily = db[5].data;
const step = 25

const table = daily;
const dynamoPrefix = dailyPrefix;

const importOld = async () => {
    for (let i = 0; i < table.length; i += step) {
        const items = [] as any[];
        table.slice(i, i + step).forEach((item: any) => {
            const processed = {
                PutRequest: {
                    Item: {
                        PK: `${dynamoPrefix}#${item.pid}`,
                        SK: getClosestDayStartTimestamp(dateToUNIXTimestamp(item.ts)),
                        tvl: Number(item.TVL)
                    }
                }
            }
            if (items.some(it => it.PutRequest.Item.PK === processed.PutRequest.Item.PK &&
                it.PutRequest.Item.SK === processed.PutRequest.Item.SK)) {
                console.log('duplicate', processed)
                return // duplicate
            }
            items.push(processed)
        })
        console.log(JSON.stringify(items))
        await client.batchWrite({
            RequestItems: {
                [TableName]: items
            }
        }).promise();
    }
}

importOld()