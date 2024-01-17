import { mixedCaseChains } from "./shared/constants"
import { distressedAssets } from "../adapters/other/distressed"

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
    const normalized = lowercaseAddress(coin)
    if(distressedAssets[normalized] === true){
        return "distressed#invalid"
    }
    return coin.startsWith("coingecko:") ? `coingecko#${cutStartWord(coin, "coingecko:")}` : `asset#${normalized}`
}

export function PKToCoin(PK:string){
    return PK.startsWith("asset#") ?
    cutStartWord(PK, "asset#") :
    `coingecko:${cutStartWord(PK, "coingecko#")}`
}

export const DAY = 3600 * 24;
