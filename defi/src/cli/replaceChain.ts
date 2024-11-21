const chainToDelete = "tron"

import dynamodb from "../utils/shared/dynamodb";
import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl, hourlyTokensTvl, hourlyTvl, hourlyUsdTokensTvl } from "../utils/getLastRecord";
import protocols from "../protocols/data";
import { getCurrentUnixTimestamp } from "../utils/date";

async function main() {
    await Promise.all(protocols.filter(p => p.category === "CEX").map(async protocol => {
        for (const tvlFunc of [hourlyTokensTvl, hourlyTvl, hourlyUsdTokensTvl]) {
            const data = await dynamodb.query({
                ExpressionAttributeValues: {
                    ":pk": tvlFunc(protocol.id),
                    ":sk": getCurrentUnixTimestamp() - 7*3600
                },
                KeyConditionExpression: "PK = :pk AND SK > :sk",
            });
            const last = data.Items![data.Items!.length-1][chainToDelete]
            for (const d of data.Items ?? []) {
                const chainData = d[chainToDelete]
                if (chainData === undefined) {
                    continue
                }
                d[chainToDelete] = last;
                if (tvlFunc === hourlyTvl) {
                    d.tvl -= chainData
                    d.tvl += last ?? 0
                } else {
                    Object.entries(chainData).forEach(tokenData => {
                        d.tvl[tokenData[0]] -= (tokenData[1] as number)
                        d.tvl[tokenData[0]] += last?.[tokenData[0]] ?? 0
                    })
                }
                await dynamodb.put(d);
            }
        }
    }))
    process.exit(0)
}
main();
