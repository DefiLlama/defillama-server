require("dotenv").config();
import { humanizeNumber } from "@defillama/sdk"
import { chains } from "./chains";

async function main(){
    await Promise.all(chains
    .map(async ([name, adapter]:any[])=>{
        try{
            const end = Math.floor(Date.now()/1e3)
            const start = end - 24*3600
            const startRun = Date.now()
            const {volume} = await adapter(start, end)
            console.log(name, humanizeNumber(volume), ((new Date().getTime() - startRun)/60e3).toFixed(2) + " minutes")
        } catch(e){
            console.log(`Adapter for ${name} failed with error`, e)
        }
    }))
}
main()