import { sendMessage } from "../../../defi/src/utils/discord";
import { getCurrentUnixTimestamp } from "../utils/date";
import { getR2JSONString } from "../utils/r2";
import { llamaRole } from "../utils/shared/constants";
import { COIN_TYPES } from "./coingecko";

const countCacheFilenames = [
    "defiCoinsCount",
    "coingeckoCoinsCount-true-undefined",
    `coingeckoCoinsCount-false-${COIN_TYPES.over100m}`,
    `coingeckoCoinsCount-false-${COIN_TYPES.over10m}`,
    `coingeckoCoinsCount-false-${COIN_TYPES.over1m}`,
    `coingeckoCoinsCount-false-${COIN_TYPES.rest}`,
]
async function main() {
    await Promise.all(countCacheFilenames.map(async (filename) => {
        const countCache = await getR2JSONString(filename);
        if (countCache?.timestamp < getCurrentUnixTimestamp() - 70 * 60) { // 1 hr
            console.log(`${filename} is stale`);
            // await sendMessage(`${llamaRole} ${filename} is stale`, process.env.TEAM_WEBHOOK!, true);
        }
    }));
}

main();