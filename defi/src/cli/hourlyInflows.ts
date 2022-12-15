import dynamodb from "../utils/shared/dynamodb";
import { hourlyTokensTvl, hourlyUsdTokensTvl } from "../utils/getLastRecord";

const main = async()=>{
    const [tokens, usdTokens] = await Promise.all([hourlyTokensTvl, hourlyUsdTokensTvl].map(prefix=>
        dynamodb
    .query({
      ExpressionAttributeValues: {
        ":pk": prefix("2269"),
        ":sk": Date.now()/1e3 - (24*3600*2)
      },
      KeyConditionExpression: "PK = :pk AND SK > :sk",
    })))
    const outflows = [] as any
    tokens.Items!.map((t, i)=>{
        if(i===0) return
        const prev = tokens.Items![i-1].tvl
        const time = t.SK;
        const usdPrices = usdTokens.Items!.find(p=>p.SK===time)!.tvl
        let outflowsNow = 0;
        Object.entries(t.tvl).forEach(([token, amountRaw])=>{
            const amount = amountRaw as number;
            const diff = amount - (prev[token] ?? 0);
            const price = usdPrices[token]/amount;
            outflowsNow += diff*price;
        })
        const d = new Date(time*1e3 + 60e3)
        console.log(outflowsNow/1e9, ",", `${d.getUTCDate()}th ${d.getUTCHours()}:00`)
        outflows.push({
            time,
            outflowsNow: outflowsNow/1e9,
            date: new Date(time*1e3).toISOString()
        })
    })
    console.table(outflows)
}
main()