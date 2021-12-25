import { fetch } from "../../utils"
import erc20 from "@defillama/sdk/build/erc20";

const PoSMappedTokenList =
    "https://api.bridge.matic.network/api/tokens/pos/erc20";
const PlasmaMappedTokenList =
    "https://api.bridge.matic.network/api/tokens/plasma/erc20";

export default async function bridge() {
    const posTokens = await fetch(PoSMappedTokenList);
    const plasmaTokens = await fetch(PlasmaMappedTokenList);
    const tokens = posTokens.data.tokens
        .concat(plasmaTokens.data.tokens);


    return tokens.map((token: any) => {
        const polygonAddress = token.childToken.toLowerCase()
        const from = "polygon:" + polygonAddress
        const to = "ethereum:" + token.rootToken.toLowerCase()
        return {
            from,
            to,
            getAllInfo: async()=>{
                const decimals = await erc20.decimals(polygonAddress, "polygon")
                const symbol = await erc20.symbol(polygonAddress, "polygon")
                return {
                    from,
                    to,
                    decimals: Number(decimals.output),
                    symbol: symbol.output
                }
            }
        }
    })
}