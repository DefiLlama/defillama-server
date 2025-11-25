import { queryAllium, startAlliumQuery } from "../helpers/allium";
import { httpGet } from "../utils/fetchURL";
import axios from "axios";
import { getEnv } from "../helpers/env";

async function solanaUsers(start: number, end: number) {
    const queryId = await startAlliumQuery(`select count(DISTINCT signer) as usercount, count(txn_id) as txcount from solana.raw.transactions where BLOCK_TIMESTAMP > TO_TIMESTAMP_NTZ(${start}) AND BLOCK_TIMESTAMP < TO_TIMESTAMP_NTZ(${end}) and success=true and is_voting=false`)
    return {
        queryId
    }
}

const timeDif = (d: string, t: number) => Math.abs(new Date(d).getTime() - new Date(t * 1e3).getTime())
function findClosestItem(results: any[], timestamp: number, getTimestamp: (x: any) => string) {
    return results.reduce((acc: any, t: any) => {
        if (timeDif(getTimestamp(t), timestamp) < timeDif(getTimestamp(acc), timestamp)) {
            return t
        } else {
            return acc
        }
    }, results[0])
}


const toIso = (d: number) => new Date(d * 1e3).toISOString()
function coinmetricsData(assetID: string) {
    return async (start: number, end: number) => {
        const result = (await httpGet(`https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?page_size=10000&metrics=AdrActCnt&assets=${assetID}&start_time=${toIso(start - 24 * 3600)}&end_time=${toIso(end + 24 * 3600)}`)).data;
        const closestDatapoint = findClosestItem(result, start, t => t.time)
        if (!closestDatapoint) {
            throw new Error(`Failed to fetch CoinMetrics data for ${assetID} on ${end}, no data`);
        }

        return parseFloat(closestDatapoint['AdrActCnt']);
    }
}

// not used because coinmetrics does some deduplication between users
async function bitcoinUsers(start: number, end: number) {
    const query = await queryAllium(`select count(DISTINCT SPENT_UTXO_ID) as usercount from bitcoin.raw.inputs where BLOCK_TIMESTAMP > TO_TIMESTAMP_NTZ(${start}) AND BLOCK_TIMESTAMP < TO_TIMESTAMP_NTZ(${end})`)
    return query[0].usercount
}

async function elrondUsers(start: number) {
    const startDate = new Date(start * 1e3).toISOString().slice(0, 10)
    const endDate = new Date((start + 86400) * 1e3).toISOString().slice(0, 10)
    const { data } = await axios.get(`https://tools.multiversx.com/data-api-v2/accounts/count?startDate=${startDate}&endDate=${endDate}&resolution=day`, {
        headers: {
            "x-api-key": getEnv('MULTIVERSX_USERS_API_KEY')
        }
    })
    const { value } = data.find((d: any) => d.date.slice(0, 10) === startDate) 
    return value
}

function getAlliumUsersChain(chain: string) {
    return async (start: number, end: number) => {
        let fromField = chain === "starknet" ? "sender_address" : "from_address"
        const queryId = await startAlliumQuery(`select count(DISTINCT ${fromField}) as usercount, count(hash) as txcount from ${chain}.raw.transactions where BLOCK_TIMESTAMP > TO_TIMESTAMP_NTZ(${start}) AND BLOCK_TIMESTAMP < TO_TIMESTAMP_NTZ(${end})`)
        return {
            queryId
        }
    }
}

function getAlliumNewUsersChain(chain: string) {
    return async (start: number, end: number) => {
        let fromField = chain === "starknet" ? "sender_address" : "from_address"
        const queryId = await startAlliumQuery(`select count(DISTINCT ${fromField}) as usercount from ${chain}.raw.transactions where nonce = 0 and BLOCK_TIMESTAMP > TO_TIMESTAMP_NTZ(${start}) AND BLOCK_TIMESTAMP < TO_TIMESTAMP_NTZ(${end})`)
        return {
            queryId
        }
    }
}

type ChainUserConfig = {
    name: string,
    id: string,
    getUsers?: (start: number, end: number) => Promise<any>,
    getNewUsers?: (start: number, end: number) => Promise<any>,
}

const alliumChains = ["arbitrum", "avalanche", "ethereum", "optimism", "polygon", "tron", "base", "scroll", "polygon_zkevm", "bsc"]

const alliumExports = alliumChains.map(c => ({ name: c, id: `chain#${c}`, getUsers: getAlliumUsersChain(c), getNewUsers: getAlliumNewUsersChain(c) }))

export default [
    {
        name: "solana",
        getUsers: solanaUsers
    },
    {
        name: "elrond",
        getUsers: elrondUsers
    },
    // https://coverage.coinmetrics.io/asset-metrics/AdrActCnt
    {
        name: "bitcoin",
        getUsers: coinmetricsData("btc")
    },
    {
        name: "litecoin",
        getUsers: coinmetricsData("ltc")
    },
    {
        name: "cardano",
        getUsers: coinmetricsData("ada")
    },
    {
        name: "algorand",
        getUsers: coinmetricsData("algo")
    },
    {
        name: "bch",
        getUsers: coinmetricsData("bch")
    },
    {
        name: "bsv",
        getUsers: coinmetricsData("bsv")
    },
].map(chain => ({
    name: chain.name,
    id: (chain as any).id ?? `chain#${chain.name}`,
    getUsers: (start: number, end: number) => chain.getUsers(start, end).then(u => typeof u === "object" ? u : ({ all: { users: u } })),
} as ChainUserConfig)).concat(alliumExports)
