import dynamodb from "../utils/shared/dynamodb";
import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl, hourlyTvl } from "../utils/getLastRecord";


async function main() {
    for (const id of [2595, 2596, 2597, 2598, 2599, 2600, 2601, 2602, 2603, 2604]) {
        for (const tvlFunc of [dailyTokensTvl, dailyTvl, dailyUsdTokensTvl,
            // hourlyTvl // - we retain hourly in case we want to refill using it for some reason
        ]) {
            await dynamodb.delete({
                Key: {
                    PK: tvlFunc(String(id)),
                    SK: 1677542400,
                },
            });
        }
    }
}

main().then(() => {
    console.log('Done!!!')
    process.exit(0)
})
