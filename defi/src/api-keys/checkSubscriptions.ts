import fetch from "node-fetch";
import ddb, { authPK, getAllItems } from "./ddb";
import { minAmount, toAddress } from "./constants";

async function getAllSubscribers(){
    return fetch("https://api.thegraph.com/subgraphs/name/0xngmi/llamasubs-optimism", {
        method: "post",
        body: JSON.stringify({
            query: `
  query Subs($now: BigInt, $receiver: Bytes, $minAmountPerCycle:BigInt) {
    subs(
      where: {startTimestamp_lt: $now, realExpiration_gte: $now, receiver: $receiver, amountPerCycle_gte: $minAmountPerCycle}
    ) {
      owner
      startTimestamp
      realExpiration
    }
  }`,
            variables: {
                now: Math.floor(Date.now() / 1e3),
                receiver: toAddress,
                minAmountPerCycle: minAmount.toString()
            }
        })
    }).then(r => r.json()).then(r => r.data.subs as any[])
}

export default async function checkSubscriptions(){
    const [allKeys, allSubscribers] = await Promise.all([
        getAllItems(),
        getAllSubscribers()
    ])
    const subs = allSubscribers.reduce<{
        [address:string]:boolean
    }>((all, sub)=>{
        all[sub.owner]=true
        return all
    }, {})
    await Promise.all(allKeys.map(async ({PK})=>{
        if(!PK.startsWith(authPK(""))){
            return
        }
        const address = PK.substring(authPK("").length).toLowerCase()
        if(!subs[address]){
            console.log(`delete ${PK}`)
            /*
            ddb.delete({
                Key:{PK} 
            })
            */
        }
    }))
}