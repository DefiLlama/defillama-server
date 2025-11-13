require("dotenv").config();
import { humanizeNumber } from "@defillama/sdk"
import { countNewUsers } from "./utils/countUsers";

async function main(){
    const file = process.argv[2]
    const adapterName = process.argv[3]
    const adapter = await import(`../${file}`)
    await Promise.all((adapter.default as {name:string, getNewUsers:any, addresses:any}[]).filter(({name, getNewUsers, addresses})=>(getNewUsers || addresses) && (adapterName === undefined || adapterName.toLowerCase() === name.toLowerCase()))
    .map(async ({name, getNewUsers, addresses})=>{
        try{
            const end = Math.floor(Date.now()/1e3)
            const start = end - 24*3600
            const startRun = Date.now()
            const users = getNewUsers?await getNewUsers(start, end):await countNewUsers(addresses, start, end)
            console.log(name, humanizeNumber(users), ((new Date().getTime() - startRun)/60e3).toFixed(2) + " minutes")
        } catch(e){
            console.log(`Adapter for ${name} failed with error`, e)
        }
    }))
}
main()

// eg: npx ts-node users/testNewUsers.ts users/chains.ts
// or npx ts-node users/testNewUsers.ts users/chains.ts ethereum
// or npx ts-node users/testNewUsers.ts users/routers/routerAddresses.ts Friend.tech