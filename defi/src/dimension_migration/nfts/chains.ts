import { queryAllium } from "../helpers/allium";
import { queryFlipside } from "../helpers/flipsidecrypto";
import { httpGet, httpPost } from "../utils/fetchURL";

async function sumPricedTokens(timestamp: number, data:any[], token_mapping: {[address:string]:string}){
    const prices = await httpGet(`https://coins.llama.fi/prices/historical/${timestamp}/${Object.values(token_mapping).map(k=>"coingecko:"+k).join(',')}`)
    const totalUsd = data.reduce((sum:number, token:any)=>{
        const price = prices.coins["coingecko:"+token_mapping[token[0]]]?.price
        if(price){
            sum += price*token[1]
        }
        return sum
    }, 0)
    return totalUsd
}

/*
Other flipside chains:
- terra: no volume
*/
async function optimism(start: number, end: number) {
    const data = await queryFlipside(`select currency_address, sum(price) from optimism.nft.ez_nft_sales where BLOCK_TIMESTAMP > TO_TIMESTAMP_NTZ(${start}) AND BLOCK_TIMESTAMP < TO_TIMESTAMP_NTZ(${end}) group by CURRENCY_ADDRESS`)
    return {
        volume: await sumPricedTokens(start, data, {
            "ETH": "ethereum",
            "0x45830b92443a8f750247da2a76c85c70d0f1ebf3": "optimism",
            "0x4200000000000000000000000000000000000006": "ethereum"
        }),
    }
}

async function avalanche(start: number, end: number) {
    const data = await queryFlipside(`select currency_address, sum(price) from avalanche.nft.ez_nft_sales where BLOCK_TIMESTAMP > TO_TIMESTAMP_NTZ(${start}) AND BLOCK_TIMESTAMP < TO_TIMESTAMP_NTZ(${end}) group by CURRENCY_ADDRESS`)
    return {
        volume: await sumPricedTokens(start, data.map(([token, value]: any)=>[token, token.startsWith("0x")?value:value/1e18]), {
            "ETH": "avalanche-2",
            "AVAX": "avalanche-2",
            "0x45830b92443a8f750247da2a76c85c70d0f1ebf3": "avalanche-2"
        }),
    }
}

async function flow(start: number, end: number) {
    const token_mapping = {
        "A.ead892083b3e2c6c.DapperUtilityCoin": "usd-coin",
        "A.3c5959b568896393.FUSD": "usd-coin",
        "A.1654653399040a61.FlowToken": "flow",
        //"A.4eded0de73020ca5.FazeUtilityCoin": 
        "A.ead892083b3e2c6c.FlowUtilityToken": "flow",
        //"A.011b6f1425389550.NWayUtilityCoin"
        "A.d01e482eb680ec9f.REVV": "revv",
        "A.b19436aae4d94622.FiatToken": "usd-coin"
    }
    const data = await queryFlipside(`select currency, sum(price) from flow.nft.ez_nft_sales where BLOCK_TIMESTAMP > TO_TIMESTAMP_NTZ(${start}) AND BLOCK_TIMESTAMP < TO_TIMESTAMP_NTZ(${end}) group by currency`)
    return {
        volume: await sumPricedTokens(start, data, token_mapping),
    }
}

async function immutablex(start: number, _end: number) {
    const data = await httpPost('https://qbolqfa7fnctxo3ooupoqrslem.appsync-api.us-east-2.amazonaws.com/graphql', 
        {"operationName":"getMetricsAll","variables":{"address":"global"},"query":"query getMetricsAll($address: String!) {\n  getMetricsAll(address: $address) {\n    items {\n      type\n      trade_volume_usd\n      trade_volume_eth\n      floor_price_usd\n      floor_price_eth\n      trade_count\n      owner_count\n      __typename\n    }\n    __typename\n  }\n  latestTrades(address: $address) {\n    items {\n      transfers {\n        token {\n          token_address\n          quantity\n          token_id\n          type\n          usd_rate\n          __typename\n        }\n        __typename\n      }\n      txn_time\n      txn_id\n      __typename\n    }\n    __typename\n  }\n}"},
        {headers:{
            "x-api-key": "da2-ceptv3udhzfmbpxr3eqisx3coe"
        }}
    )
    return {
        volume: data.data.getMetricsAll.items.slice(1).reduce((closest:any, item:any)=>{
            if(Math.abs(new Date(item.type).getTime()/1e3 - start) < Math.abs(new Date(closest.type).getTime()/1e3 - start)){
                return item
            }
            return closest
        }).trade_volume_usd
    }
}

async function ronin(_start: number, _end: number) {
    const data = await httpPost('https://graphql-gateway.axieinfinity.com/graphql', 
        {"operationName":"GetOverviewToday","variables":{},"query":"query GetOverviewToday {\n  marketStats {\n    last24Hours {\n      ...OverviewFragment\n      __typename\n    }\n    last7Days {\n      ...OverviewFragment\n      __typename\n    }\n    last30Days {\n      ...OverviewFragment\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment OverviewFragment on SettlementStats {\n  count\n  axieCount\n  volume\n  volumeUsd\n  __typename\n}\n"}
    )
    return {
        volume: Number(data.data.marketStats.last24Hours.volumeUsd)
    }
}

function getAlliumVolume(chain: string) {
    return async (start: number, end: number) => {
        const query = await queryAllium(`select sum(usd_price) as usd_volume from ${chain}.nfts.trades where BLOCK_TIMESTAMP > TO_TIMESTAMP_NTZ(${start}) AND BLOCK_TIMESTAMP < TO_TIMESTAMP_NTZ(${end})`)
        return {
            volume: query[0].usd_volume
        }
    }
}

async function cardano(_start: number, _end: number) {
    const data = await httpGet("https://server.jpgstoreapis.com/analytics/marketStats?timeframe=24h", {
        headers:{
            "X-Jpgstore-Csrf-Protection": "1"
        }
    })
    const price = await httpGet("https://coins.llama.fi/prices/current/coingecko:cardano")
    return {
        volume: Number(data.marketStats.volume)*price.coins["coingecko:cardano"].price
    }
}

async function ethereum(_start: number, _end: number) {
    const data = await httpGet("https://nft.llama.fi/exchangeStats")
    const price = await httpGet("https://coins.llama.fi/prices/current/coingecko:ethereum")
    return {
        volume: Number(data.reduce((sum:number, ex:any)=>{
            if(["AlphaSharks", "Gem"].includes(ex.exchangeName) || ex.exchangeName.includes("Aggregator")){
                return sum
            }
            return sum+ex["1DayVolume"]
        }, 0))*price.coins["coingecko:ethereum"].price
    }
}

/*
missing:
- tezos
- bsc
- mythos?
- cronos
- wax
- panini
- arbitrum
- tron
*/

export const chains = [
    ["ethereum", ethereum],
    ["optimism", optimism],
    ["flow", flow],
    ["avalanche", avalanche],
    ["immutablex", immutablex],
    ["ronin", ronin],
    ["polygon", getAlliumVolume("polygon")],
    ["solana", getAlliumVolume("solana")],
    //["bitcoin", getAlliumVolume("bitcoin")],
    ["cardano", cardano],
]