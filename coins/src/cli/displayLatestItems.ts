require("dotenv").config()
import ddb from "../utils/shared/dynamodb";
import adapterResults from "../../adapterResults.json"

const start = 1660313930

async function main() {
    await Promise.all(Array.from(new Set(adapterResults[0].map(item=>item.PK))).map(async item => {
        const lastResults = await ddb
            .query({
                ExpressionAttributeValues: {
                    ":pk": item,
                    ":start": start,
                },
                KeyConditionExpression: `PK = :pk AND SK >= :start`,
                //ScanIndexForward: search === "high",
            })
        if((lastResults.Items?.length ?? 0)>0){
            console.table(lastResults.Items)
        }
    }))
}

main();
