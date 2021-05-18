import protocols from '../protocols/data'
import dynamodb from "../utils/dynamodb";
import { getClosestDayStartTimestamp } from "../date/getClosestDayStartTimestamp";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import { getBlocksRetry } from './utils'
import {
    getCoingeckoLock,
    releaseCoingeckoLock,
} from "../storeTvlUtils/coingeckoLocks";
import { dailyTvl } from '../utils/getLastRecord';

const date = (timestamp: number) => '\t' + new Date(timestamp * 1000).toDateString()

const projectsToRefill: string[] = []
const notify = false;
const deleteRepeated = false;
const extrapolate = false;

const secondsInDay = 86400;
async function main() {
    if (projectsToRefill.length > 0) {
        setInterval(() => {
            releaseCoingeckoLock();
        }, 1e3);
    }
    await Promise.all(protocols.map(async (protocol) => {
        const historicalTvl = await dynamodb.query({
            ExpressionAttributeValues: {
                ":pk": `dailyTvl#${protocol.id}`,
            },
            KeyConditionExpression: "PK = :pk",
        });
        if (historicalTvl.Items !== undefined && historicalTvl.Items.length > 0) {
            const items = historicalTvl.Items
            let lastItemDate = getClosestDayStartTimestamp(items[0].SK);
            for (let i = 1; i < items.length; i++) {
                const item = items[i];
                const timestamp = getClosestDayStartTimestamp(item.SK);
                const diff = timestamp - lastItemDate
                const under = diff < secondsInDay * 0.5
                const over = diff > secondsInDay * 1.5
                if ((over || under) && notify) {
                    console.log(protocol.name.padEnd(19, ' '), diff / secondsInDay, date(timestamp), date(lastItemDate))
                }
                if (over && projectsToRefill.includes(protocol.name)) {
                    let nextTimestamp = lastItemDate;
                    do {
                        nextTimestamp = getClosestDayStartTimestamp(nextTimestamp + secondsInDay)
                        let tvl;
                        if (extrapolate) {
                            const totalTimeDiff = item.SK - items[i-1].SK
                            tvl = (item.tvl*(nextTimestamp - items[i-1].SK)+items[i-1].tvl*(item.SK - nextTimestamp))/totalTimeDiff
                            await dynamodb.put({
                                PK: dailyTvl(protocol.id),
                                SK: nextTimestamp,
                                tvl
                            })
                        } else {
                            const { ethereumBlock, chainBlocks } = await getBlocksRetry(nextTimestamp);
                            tvl = await storeTvl(
                                nextTimestamp,
                                ethereumBlock,
                                chainBlocks,
                                protocol,
                                {},
                                4,
                                getCoingeckoLock,
                                false,
                                false,
                                true,
                            );
                        }
                        console.log(protocol.name, date(nextTimestamp), tvl)
                    } while (nextTimestamp < timestamp)
                }
                if (under && deleteRepeated) {
                    console.log('Delete', protocol.name, timestamp);
                    await dynamodb.delete({
                        Key: {
                            PK: item.PK,
                            SK: item.SK
                        }
                    })
                }
                lastItemDate = timestamp
            };
        }
    }))
}
main()