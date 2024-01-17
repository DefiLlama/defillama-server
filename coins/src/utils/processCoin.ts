import { mixedCaseChains } from "./shared/constants"

export function lowercaseAddress(coin: string) {
    const chain = coin.substring(0, coin.indexOf(':'))
    if (mixedCaseChains.includes(chain)) {
        return coin
    } else if (coin.startsWith("gnosis:")) {
        return coin.replace("gnosis:", "xdai:").toLowerCase()
    }
    return coin.toLowerCase()
}

export function cutStartWord(text: string, startWord: string) {
    return text.slice(startWord.length)
}

export function coinToPK(coin: string) {
    return coin.startsWith("coingecko:") ? `coingecko#${cutStartWord(coin, "coingecko:")}` : `asset#${lowercaseAddress(coin)}`
}

export function PKToCoin(PK:string){
    return PK.startsWith("asset#") ?
    cutStartWord(PK, "asset#") :
    `coingecko:${cutStartWord(PK, "coingecko#")}`
}

export const DAY = 3600 * 24;
