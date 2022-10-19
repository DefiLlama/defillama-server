import { fetch, getAllInfo } from "../utils"

const PoSMappedTokenList =
    "https://api.bridge.matic.network/api/tokens/pos/erc20";
const PlasmaMappedTokenList =
    "https://api.bridge.matic.network/api/tokens/plasma/erc20";

export default async function bridge() {
    const posTokens = await fetch(PoSMappedTokenList);
    const plasmaTokens = await fetch(PlasmaMappedTokenList);
    const tokens = posTokens.tokens
        .concat(plasmaTokens.tokens);

    return tokens.map((token: any) => {
        const polygonAddress = token.childToken.toLowerCase()
        const from = "polygon:" + polygonAddress
        const to = "ethereum:" + token.rootToken.toLowerCase()
        return {
            from,
            to,
            getAllInfo: getAllInfo(polygonAddress, 'polygon', to)
        }
    })
}