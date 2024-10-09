import { blockPK } from "../getBlock"
import ddb, { getHistoricalValues } from "../utils/shared/dynamodb"

const chains = ["ethereum"]
const DRY_RUN:boolean = true

async function main() {
    await Promise.all(chains.map(async chain=>{
        const entries = await getHistoricalValues(blockPK(chain))
        let lastHeight = 0
        entries.forEach(entry=>{
            if(entry.height < lastHeight){
                console.log(entry, lastHeight)
                if(DRY_RUN === false){
                    ddb.delete({
                        Key:{
                        PK: entry.PK,
                        SK: entry.SK
                        }
                    })
                }
            } else {
                lastHeight = entry.height
            }
        })
    }))
}

main()