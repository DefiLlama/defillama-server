import fetch from "node-fetch";
import { getCoingeckoLock, setTimer } from "../utils/shared/coingeckoLocks";

const cache = {} as {
    [key: string]: Promise<number> | undefined
}

setTimer(100);

async function getAvgPrice(start: number, end: number, chain: string) {
    const [startPrice, endPrice] = await Promise.all([start, end].map(async t => {
        const coinKey = `${chain}:0x0000000000000000000000000000000000000000`
        const url = `https://coins.llama.fi/prices/historical/${t}/${coinKey}?searchWidth=12h`
        for (let i = 0; i < 5; i++) {
            try {
                await getCoingeckoLock()
                const data = await fetch(url)
                    .then(r => r.json())
                return data.coins[coinKey].price
            } catch (e) { }
        }
        throw new Error(`Failed at ${url}`)
    }))
    return (startPrice + endPrice) / 2
}

export function getGasPrice(start: number, end: number, chain: string) {
    const cacheKey = `${chain}#${start}#${end}`
    if (!cache[cacheKey]) {
        cache[cacheKey] = getAvgPrice(start, end, chain)
    }
    return cache[cacheKey]!
}