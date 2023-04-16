const protocolName = "binance cex"
const chainToChange = "bsc"
const tokenToChange = "binancecoin"
const valueToSet = 30e6
const start = Math.round(new Date("2023-02-01").getTime()/1e3)

import dynamodb, { getHistoricalValues } from "../utils/shared/dynamodb";
import { hourlyTokensTvl, hourlyTvl, hourlyUsdTokensTvl, dailyTokensTvl, dailyTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";
import { getProtocol } from "./utils";

const tokensKey = hourlyTokensTvl
const usdTokensKey = hourlyUsdTokensTvl
const tvlKey = hourlyTvl

async function main() {
    const protocol = getProtocol(protocolName)
    const data = (await getHistoricalValues(tvlKey(protocol.id))).filter(t=>t.SK>start)
    for (const d of data ?? []) {
        const tokens = await dynamodb.get({
            PK: tokensKey(protocol.id),
            SK: d.SK
        })
        const usdTokens = await dynamodb.get({
            PK: usdTokensKey(protocol.id),
            SK: d.SK
        })
        if(usdTokens.Item === undefined || tokens.Item === undefined){
            throw new Error(`Rugged at ${d.SK}`)
        }
        const price = usdTokens.Item.tvl[tokenToChange]/tokens.Item.tvl[tokenToChange]

        const extraTvl = ((tokens.Item.tvl[tokenToChange] + tokens.Item.tvl.BNB) - valueToSet) * price
        d.tvl -= extraTvl
        d[chainToChange] -= extraTvl
        tokens.Item.tvl[tokenToChange] = valueToSet
        tokens.Item[chainToChange][tokenToChange] = valueToSet
        usdTokens.Item.tvl[tokenToChange] = valueToSet * price
        usdTokens.Item[chainToChange][tokenToChange] = valueToSet * price

        for(const f of [tokens.Item.tvl, tokens.Item[chainToChange], usdTokens.Item.tvl[tokenToChange], usdTokens.Item[chainToChange]]){
            delete f.BNB
        }

        await dynamodb.put(d);
        await dynamodb.put(tokens.Item);
        await dynamodb.put(usdTokens.Item);
       //console.log(d)
        
        console.log(`stored for ${d.SK}`)
    }
}
main();
