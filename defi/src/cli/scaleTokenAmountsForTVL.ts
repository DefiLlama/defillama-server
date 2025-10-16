import { getProtocolItems } from "../api2/db";
import { dailyTvl, dailyRawTokensTvl, dailyTokensTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";
import { PromisePool } from "@supercharge/promise-pool";
import dynamodb from "../utils/shared/dynamodb";

// config 
const id = '5995'
const chain = 'ripple'
const tokens = ['openeden-tbill', 'TBILL']
const decimals = 0
const rawToken = 'ripple:TBL.rJNE2NNz83GJYtWVLwMvchDWEon3huWnFn'
const priceKey = 'coingecko:openeden-tbill'
const minTvl = 50000000
const timestampFrom = Math.floor(new Date('2025-08-28').getTime() / 1000) // last accurate record
const timestampTo = Math.floor(new Date('2025-09-16').getTime() / 1000) // first accurate record 

const tvlTypes = [dailyTokensTvl, dailyUsdTokensTvl, dailyTvl, dailyRawTokensTvl]

async function getFaultyTimestamps(tvlType: (id: string) => string) {
    const storedRecords = await getProtocolItems(tvlType, id, {
        timestampFrom: timestampFrom - (86400 * 2),
        timestampTo: timestampTo + 1,
    })

    const filteredRecords = storedRecords.filter((record: any) => Object.keys(record[chain]).map((token) => 
        tokens.includes(token) ? record[chain][token] : 0).reduce((a, b) => a + b, 0) < minTvl)

    const faultyTimestamps = filteredRecords.map((record: any) => record.SK)

    const recordBeforeGap = Object.keys(storedRecords[0][chain]).map((token) => {
        if (storedRecords[0][chain][token] > 0) {
            return storedRecords[0][chain][token]
        }
        return 0
    }).reduce((a, b) => a + b, 0)

    const recordAfterGap = Object.keys(storedRecords[storedRecords.length - 1][chain]).map((token) => {
        if (storedRecords[storedRecords.length - 1][chain][token] > 0) {
            return storedRecords[storedRecords.length - 1][chain][token]
        }
        return 0
    }).reduce((a, b) => a + b, 0)

    return { timestamps: faultyTimestamps, recordBeforeGap, recordAfterGap }
}

async function main() {
    const {timestamps, recordBeforeGap, recordAfterGap } = await getFaultyTimestamps(dailyTokensTvl)

    const { coins } = await fetch(`https://coins.llama.fi/batchHistorical?coins=${JSON.stringify({
            [priceKey]: timestamps,
        })}`).then(r => r.json())

    const prices = coins[priceKey].prices
    const startQty = recordBeforeGap / prices[prices.length - 1].price
    const endQty = recordAfterGap / prices[0].price
    const qtyStep = (endQty - startQty) / timestamps.length


    await Promise.all(tvlTypes.map(async (tvlType) => {
        const dbKey = tvlType(id)
        const storedRecords = await getProtocolItems(tvlType, id, {
            timestampFrom: timestampFrom - (86400 * 2), 
            timestampTo: timestampTo + 1,
        })

        await PromisePool.withConcurrency(10).for(storedRecords).process(async (record: any) => {
            try {
                const index = timestamps.indexOf(record.SK)
                if (index < 0) return 

                let addition = startQty + index * qtyStep
                let tokenKey = dbKey.includes('Raw') ? rawToken : tokens[0]
                let newRecord = record

                if (dbKey.includes('Raw')) { // scale by decimals 
                    addition = addition * 10 ** decimals
                    newRecord[chain][tokenKey] = addition
                    newRecord.tvl[tokenKey] = (newRecord.tvl[tokenKey] ?? 0) + addition
                } if (dbKey.includes('Usd')) { // scale by price 
                    addition = addition * prices[index].price
                    newRecord[chain][tokenKey] = addition
                    newRecord.tvl[tokenKey] = (newRecord.tvl[tokenKey] ?? 0) + addition
                } if (!dbKey.includes('Tokens')) { // just aggregate USD TVLs 
                    addition = addition * prices[index].price
                    newRecord[chain] = (newRecord[chain] ?? 0) + addition
                    newRecord.tvl = newRecord.tvl + addition
                } else { // dailyTokensTvl
                    newRecord[chain][tokenKey] = addition
                    newRecord.tvl[tokenKey] = (newRecord.tvl[tokenKey] ?? 0) + addition
                }


                await dynamodb.put({ PK: dbKey, ...newRecord, });
            } catch (e) {
                throw e;
            }
        })
    }))

    return
}
main() // ts-node defi/src/cli/scaleTokenAmountsForTVL.ts