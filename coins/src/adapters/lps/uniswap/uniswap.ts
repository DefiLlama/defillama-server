import { multiCall, call } from "@defillama/sdk/build/abi/index"
import { getLatestBlock } from "@defillama/sdk/build/util/index"
import abi from "./abi.json"
import { request, gql } from "graphql-request"
import { batchGet } from "../../../utils/shared/dynamodb"
import { PromisePool } from '@supercharge/promise-pool'

const pairsPerCall = 100
const lpQuery = gql`
query lps($firstLp: ID!){
	pairs(first:${pairsPerCall}, where:{id_gte: $firstLp}){
		id
		reserve0,
		reserve1,
		totalSupply,
		token0{
			id
		},
		token1{
			id
		},
	}
}
`

const simulatenousCalls = 1000;
export async function getPairPrices(chain: string, factory: string, subgraph: string) {
    const pairsLength = Number((await call({
        target: factory,
        chain: chain as any,
        abi: abi.allPairsLength
    })).output)
    const calls = Array.from(Array(Math.floor(pairsLength / pairsPerCall)).keys()).map(i => ({
        target: factory,
        params: i
    }))
    const lpsEveryStep = await multiCall({
        target: factory,
        chain: chain as any,
        calls,
        abi: abi.allPairs,
        requery: true,
    })
    const underlyingTokens = new Set<string>()
    let callsmade = 0;

    const { results, errors } = await PromisePool
        .withConcurrency(simulatenousCalls)
        .for(lpsEveryStep.output)
        .process(async (call, _index, _pool) => {
            const {pairs} = await request(subgraph, lpQuery, {
                firstLp: call.output.toLowerCase()
            })

            pairs.map((pair: any) => {
                underlyingTokens.add(pair.token0.id);
                underlyingTokens.add(pair.token1.id);
            })
            console.log(callsmade++)
            return pairs
        })
    /*
    for (let i = 0; i < lpsEveryStep.output.length; i += simulatenousCalls) {
        const requests = await Promise.all(lpsEveryStep.output.slice(i, i + simulatenousCalls).map(call => request(subgraph, lpQuery, {
            firstLp: call.output.toLowerCase()
        }).then((r: any) => {
            r.pairs.map((pair: any) => {
                underlyingTokens.add(pair.token0.id);
                underlyingTokens.add(pair.token1.id);
            })
            console.log(callsmade++)
            return r.pairs
        })))
    }
    */
    console.log("done")

    const tokenPrices = await batchGet(Array.from(underlyingTokens).map(t => ({
        PK: `asset#${chain}:${t}`,
        SK: 0
    })))
    //const lp = [].concat(...)
}