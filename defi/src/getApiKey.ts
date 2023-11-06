import { recoverAddress } from "ethers/lib/utils"

const FRONTEND_DOMAIN = "defillama.com"
const CHAIN_ID = "1"

function getValue(raw: string) {
    return raw.substring(raw.indexOf(": ") + 2)
}

async function verify(message: string, signature: string) {
    /*
    ${domain} wants you to sign in with your Ethereum account:
    ${address}
    
    ${statement}
    
    URI: ${uri}
    Version: ${version}
    Chain ID: ${chain-id}
    Nonce: ${nonce}
    Issued At: ${issued-at}
    */
    const [
        domainStatement,
        address,
        ,
        statement,
        ,
        uri,
        version,
        chainId,
        nonce,
        issuedAt
    ] = message.split("\n")
    if (domainStatement !== `${FRONTEND_DOMAIN}  wants you to sign in with your Ethereum account:`
        || statement !== `Sign in to defillama.com to get API Key`
        || !getValue(uri).startsWith(`https://${FRONTEND_DOMAIN}`)
        || getValue(version) !== "1"
        || getValue(chainId) !== CHAIN_ID
        || new Date(getValue(issuedAt)).getTime() < (Date.now() - 3 * 3600e3) // not older than 3 hours
        || address !== recoverAddress(`\x19Ethereum Signed Message:\n${message.length}` + message, signature)
    ) {
        throw new Error("Bad signature")
    }
}