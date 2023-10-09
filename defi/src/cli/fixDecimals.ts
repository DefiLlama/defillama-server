import dynamodb, { batchGet } from "../utils/shared/dynamodb"
const fs = require('fs')

async function main(){
    const data = fs.readFileSync(`0sk`, "utf8").split("\n") as string[]
    const all = {} as any
    data.forEach((itemRaw)=>{
        try{
            const item = JSON.parse(itemRaw)
            if(item.Item.decimals){
                all[item.Item.PK.S] = Number(item.Item.decimals.N)
            }
        } catch(e){
            console.log(e, itemRaw)
        }
    })
    const currentInfo = await batchGet(Object.keys(all).map(i=>({
        SK:0,
        PK:i
    })))
    fs.writeFileSync("batchGet", JSON.stringify(currentInfo))
    await Promise.all(currentInfo.map(async final=>{
        if(all[final.PK] !== final.decimals){
            console.log(final.PK, all[final.PK], final.decimals)
            final.decimals = all[final.PK]
            await dynamodb.put(final)
        }
    }))
}
main()