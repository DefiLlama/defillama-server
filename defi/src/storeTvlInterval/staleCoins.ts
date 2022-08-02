import { getCurrentUnixTimestamp } from "../utils/date"
import { executeAndIgnoreErrors } from "./errorDb"

export interface StaleCoins {
    [address: string]: {
        symbol: string,
        lastUpdate: number,
    }
}

export function addStaleCoin(staleCoins: StaleCoins, address: string, symbol: string, lastUpdate: number) {
    if (staleCoins[address] === undefined) {
        staleCoins[address] = {
            symbol,
            lastUpdate
        }
    }
}

export function storeStaleCoins(staleCoins: StaleCoins) {
    const currentTime = getCurrentUnixTimestamp()
    return Promise.all(Object.entries(staleCoins).map(([address, details]) => {
        const chain = address.split(':')[0]
        return executeAndIgnoreErrors('INSERT INTO `staleCoins` VALUES (?, ?, ?, ?, ?)', [currentTime, address, details.lastUpdate, chain, details.symbol])
    }))
}