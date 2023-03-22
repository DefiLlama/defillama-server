import { fetch, getAllInfo } from "../utils"

const tokenList = "https://api-polygon-tokens.polygon.technology/tokenlists/polygonTokens.tokenlist.json";

export default async function bridge() {
    const tokens = await fetch(
        tokenList
      )
      .then((r) => r.json())
      .then((r) => r.tokens);

    return tokens.map((token: any) => {
        const polygonAddress = token.address.toLowerCase()
        const from = "polygon:" + polygonAddress
        const to = "ethereum:" + token.extensions.rootAddress.toLowerCase()
        return {
            from,
            to,
            getAllInfo: getAllInfo(polygonAddress, 'polygon', to)
        }
    })
}