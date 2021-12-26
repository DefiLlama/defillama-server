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

import { overwrites } from './overwrites'

async function storeTokens() {
/*
- make all addresses lowercase
- redirect when we encounter redirect
- handle gecko# properly
- check if already exists
- handle getAllInfo
- handle overwrites
*/
}