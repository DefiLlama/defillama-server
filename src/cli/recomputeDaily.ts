import {client, TableName, dailyPrefix} from './dynamodb'
import {getProtocol} from './utils'


async function main(){
    const protocol = getProtocol('pangolin')
    const adapter = await import(`../../DefiLlama-Adapters/projects/${protocol.module}`)
    const PK = `${dailyPrefix}#${protocol.id}`
    const dailyTxs = await client
    .query({
      TableName,
      ExpressionAttributeValues: {
        ":pk": PK,
      },
      KeyConditionExpression: "PK = :pk",
    }).promise()
    console.log(dailyTxs)
    await Promise.all(dailyTxs.Items!.map(async item=>{
        const {SK} = item;
        console.log(SK, item.tvl)
        const balances = await adapter.tvl(SK)
        const tvl = Number(balances['0xdac17f958d2ee523a2206206994597c13d831ec7'])/1e6
        await client.update({
            TableName,
            Key:{
                PK,
                SK
            },
            UpdateExpression: "set tvl = :tvl",
            ExpressionAttributeValues:{
                ":tvl": tvl,
            },
        }).promise()
    }))
}

main()