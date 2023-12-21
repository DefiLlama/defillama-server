const protocolName = "huobi"
const chainToChange = "ethereum"
const tokenToDelete = "HBTC"
const hourly = true

import dynamodb, { getHistoricalValues } from "../utils/shared/dynamodb";
import { hourlyTokensTvl, hourlyTvl, hourlyUsdTokensTvl, dailyTokensTvl, dailyTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";
import { getProtocol } from "./utils";

const tokensKey = hourly?hourlyTokensTvl:dailyTokensTvl
const usdTokensKey = hourly?hourlyUsdTokensTvl:dailyUsdTokensTvl
const tvlKey = hourly?hourlyTvl:dailyTvl

async function main() {
    const protocol = getProtocol(protocolName)
    const data = (await getHistoricalValues(tvlKey(protocol.id)))
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

        const extraTvl = usdTokens.Item.tvl[tokenToDelete] ?? 0
        d.tvl -= extraTvl
        d[chainToChange] -= extraTvl
        for(const f of [tokens.Item.tvl, tokens.Item[chainToChange], usdTokens.Item.tvl, usdTokens.Item[chainToChange]]){
            delete f[tokenToDelete]
        }

        await dynamodb.put(d);
        await dynamodb.put(tokens.Item);
        await dynamodb.put(usdTokens.Item);
        //console.log(d, tokens.Item, usdTokens.Item)
        
        console.log(`stored for ${d.SK}`)
    }
}
main();
