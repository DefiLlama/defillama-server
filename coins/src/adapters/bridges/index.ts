import anyswap from './anyswap'
import arbitrum from './arbitrum'
import avax from './avax'
import bsc from './bsc'
import fantom from './fantom'
import gasTokens from './gasTokens'
import harmony from './harmony'
import optimism from './optimism'
import polygon from './polygon'
import solana from './solana'
import xdai from './xdai'

type Token = {
    from: string,
    to: string,
    decimals: number,
    symbol: string
} | {
    from: string,
    to: string,
    getAllInfo: () => Promise<{
        from: string;
        to: string;
        decimals: number;
        symbol: any;
    }>;
}
type Bridge = () => Promise<Token[]>

export const chainsThatShouldNotBeLowerCased = ["solana"]
function normalizeBridgeResults(bridge: Bridge) {
    return async () => {
        const tokens = await bridge()
        return tokens.map(token => {
            const chain = token.from.split(':')[0]
            if (chainsThatShouldNotBeLowerCased.includes(chain)) {
                return token
            }
            return {
                ...token,
                from: token.from.toLowerCase(),
                to: token.to.toLowerCase(),
            }
        })
    }
}
export const bridges = [anyswap, arbitrum, avax, bsc, fantom, gasTokens, harmony, optimism, polygon, solana, xdai].map(normalizeBridgeResults) as Bridge[]

import ddb, { batchGet } from '../../utils/shared/dynamodb'
import { getCurrentUnixTimestamp } from '../../utils/date'

const craftToPK = (to: string) => to.includes("#") ? to : `asset#${to}`

async function storeTokensOfBridge(bridge: Bridge) {
    const tokens = await bridge();
    const alreadyLinked = (await batchGet(tokens.map(t => ({
        PK: `asset#${t.from}`,
        SK: 0
    })))).reduce((all, record) => {
        all[record.PK.substr("asset#".length)] = true;
        return all
    }, {})
    const unlisted = tokens.filter(t => alreadyLinked[t.from] !== true)
    const toAddressToRecord = {} as { [PK: string]: string }
    const toRecords = await batchGet(unlisted.map(t => ({
        PK: craftToPK(t.to),
        SK: 0
    })))
    await Promise.all(toRecords.map(async record => {
        const toPK = record.PK
        if (record.price) {
            toAddressToRecord[toPK] = toPK
        } else if (record.redirect) {
            const redirectedRecord = await ddb.get({
                PK: record.redirect,
                SK: 0
            })
            if (redirectedRecord.Item?.price) {
                toAddressToRecord[toPK] = redirectedRecord.Item.PK
            }
        }
    }))
    await Promise.all(unlisted.map(async token => {
        const toPK = craftToPK(token.to);
        const finalPK = toAddressToRecord[toPK]
        if (finalPK === undefined) {
            return null
        }
        let decimals: number, symbol: string;
        if("getAllInfo" in token){
            const newToken = await token.getAllInfo()
            decimals = newToken.decimals;
            symbol = newToken.symbol;
        } else {
            decimals = token.decimals;
            symbol = token.symbol;
        }
        const timestamp = getCurrentUnixTimestamp()
        await ddb.put({
            PK: `asset#${token.from}`,
            SK: 0,
            created: timestamp,
            decimals,
            symbol,
            redirect: finalPK,
        })
    }))
}
export async function storeTokens() {
    await Promise.all(bridges.map(storeTokensOfBridge));
}