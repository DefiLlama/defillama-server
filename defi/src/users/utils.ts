import fetch from "node-fetch";

const cache = {} as {
    [key: string]: Promise<number> | undefined
}

async function getAvgPrice(start: number, end: number, chain: string) {
    const [startPrice, endPrice] = await Promise.all([start, end].map(t =>
        fetch(`https://coins.llama.fi/prices/historical/${t}/${chain}:0x0000000000000000000000000000000000000000?searchWidth=4h`)
            .then(r => r.json()).then(r => r.coins[`${chain}:0x0000000000000000000000000000000000000000`].price)))
    return (startPrice + endPrice) / 2
}

export function getGasPrice(start: number, end: number, chain: string) {
    const cacheKey = `${chain}#${start}#${end}`
    if (!cache[cacheKey]) {
        cache[cacheKey] = getAvgPrice(start, end, chain)
    }
    return cache[cacheKey]!
}