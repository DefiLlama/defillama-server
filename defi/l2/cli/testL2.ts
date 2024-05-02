import calculateTvl from "../tvl"
import { canonicalBridgeIds, chainsWithoutCanonicalBridges, protocolBridgeIds } from "../constants";

function deleteOtherChains(obj:any, chainToFetch:string){
    Object.keys(obj).forEach(key=>{
        if(obj[key].toLowerCase() !== chainToFetch){
            delete obj[key]
        }
    })
}

async function main(){
    const chainToFetch = process.argv[2].toLowerCase()
    deleteOtherChains(canonicalBridgeIds, chainToFetch)
    deleteOtherChains(protocolBridgeIds, chainToFetch)
    for(let i = 0; i<chainsWithoutCanonicalBridges.length;){
        const chain = chainsWithoutCanonicalBridges[i]
        if(chain.toLowerCase() !== chainToFetch){
            chainsWithoutCanonicalBridges.splice(i, 1)
        } else {
            i++;
        }
    }
    const tvl = await calculateTvl()
    if(Object.keys(tvl[chainToFetch]).length === 0){
        console.log(`Chain with name "${chainToFetch}" doesn't exist, make sure that youre using the correct chain name and cross-check against "defi/l2/constants.ts"`)
    }
    console.log(JSON.stringify(tvl[chainToFetch], null, 2))
    process.exit(0)
}
main()

// Usage: export AWS_REGION='eu-central-1' && export tableName='prod-table' && npx ts-node l2/cli/testL2.ts mode