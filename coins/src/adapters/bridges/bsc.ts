import { fetch, formatExtraTokens } from "../utils"

export default async function bridge() {
    const binanceBridge = (
        await fetch(
            "https://api.binance.org/bridge/api/v2/tokens?walletNetwork="
        )
    ).data.tokens as any[];

    return binanceBridge.filter(token => token.ethContractAddress !== "").map(token=>({
        from: `bsc:${token.bscContractAddress}`,
        to: `ethereum:${token.ethContractAddress}`,
        decimals: token.bscContractDecimal,
        symbol: token.bscSymbol,
    })).concat(extraTokens)
}

const extraTokens = formatExtraTokens("bsc", [
    ["0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c", "avax:0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c", "ELK", 18],
    ["0x2170ed0880ac9a755fd29b2688956bd959f933f8", "ethereum:0x0000000000000000000000000000000000000000", "ETH", 18],
    ["0xe85afccdafbe7f2b096f268e31cce3da8da2990a", "bsc:0x123", "aBnBc", 18],   // HOTFIX for hacked aBnB token
    ["0xbb1aa6e59e5163d8722a122cd66eba614b59df0d", "bsc:0x123", "aBnBb", 18],   // HOTFIX for hacked aBnB token
])