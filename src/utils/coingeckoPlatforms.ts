interface StringObject {
    [id: string]: string | undefined
}
const platformMap = {
    'binance-smart-chain': 'bsc',
    'ethereum': 'ethereum',
    'polygon-pos': 'polygon',
    'avalanche': 'avax',
    'wanchain': 'wan',
    'fantom': 'fantom',
    'xdai': 'xdai',
    'okex-chain': 'okex',
    "huobi-token": 'heco'
} as StringObject

export interface Coin {
    id: string,
    symbol: string,
    name: string
}

export async function iterateOverPlatforms(coinData: any, coin: Coin, iterator: (PK: string, tokenAddress: string, chain: string) => Promise<void>) {
    const platforms = coinData.platforms as StringObject;
    for (const platform in platforms) {
        if (platform !== "" && platforms[platform] !== "") {
            try {
                const chain = platformMap[platform.toLowerCase()];
                if (chain === undefined) {
                    continue;
                }
                const address = chain + ':' + platforms[platform]!.toLowerCase().trim()
                const PK = `asset#${address}`
                await iterator(PK, platforms[platform]!, chain);
            } catch (e) {
                console.error(coin, platform, e);
            }
        }
    }
}