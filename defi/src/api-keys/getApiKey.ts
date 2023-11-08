import { recoverAddress } from "ethers/lib/utils"

import { randomBytes } from "crypto";
import ddb, { authPK } from "./ddb";
import { errorResponse, successResponse, wrap, IResponse } from "../utils/shared";
import fetch from "node-fetch";
import { minAmount, toAddress } from "./constants";

const FRONTEND_DOMAIN = "defillama.com"
const CHAIN_ID = "1"

function getValue(raw: string) {
    return raw.substring(raw.indexOf(": ") + 2)
}

function verifySig(message: string, signature: string) {
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
        || statement !== `Sign in to ${FRONTEND_DOMAIN} to get API Key`
        || !getValue(uri).startsWith(`https://${FRONTEND_DOMAIN}`)
        || getValue(version) !== "1"
        || getValue(chainId) !== CHAIN_ID
        || new Date(getValue(issuedAt)).getTime() < (Date.now() - 3 * 3600e3) // not older than 3 hours
        || address !== recoverAddress(`\x19Ethereum Signed Message:\n${message.length}` + message, signature)
    ) {
        return false
    }
    return true
}

function isSubscribed(toAddress: string, amount: number, userAddress: string) {
    return fetch("https://api.thegraph.com/subgraphs/name/0xngmi/llamasubs-optimism", {
        method: "post",
        body: JSON.stringify({
            query: `
  query Subs($now: BigInt, $userAddress: Bytes, $receiver: Bytes, $minAmountPerCycle:BigInt) {
    subs(
      where: {owner: $userAddress, startTimestamp_lt: $now, realExpiration_gte: $now, receiver: $receiver, amountPerCycle_gte: $minAmountPerCycle}
    ) {
      startTimestamp
      realExpiration
    }
  }`,
            variables: {
                now: Math.floor(Date.now() / 1e3),
                userAddress,
                receiver: toAddress,
                minAmountPerCycle: amount.toString()
            }
        })
    }).then(r => r.json()).then(r => r.data.subs.length > 0)
}

async function generateApiKey(address:string){
    // This system is vulnerable to race conditions to generate multiple api keys but thats not a big issue since we'll detect it anyway
    // and theres no point in getting multiple api keys
    const addresKeyPK = `addressKey#${address.toLowerCase()}`
    const prevApiKey = await ddb.get({
        PK: addresKeyPK,
    })
    if (prevApiKey.Item) {
        await ddb.delete({
            Key: {
                PK: authPK(prevApiKey.Item.apiKey),
            }
        })
    }
    const apiKey = randomBytes(40).toString("base64url")
    await ddb.put({
        PK: authPK(apiKey),
        address: address.toLowerCase()
    })
    await ddb.put({
        PK: addresKeyPK,
        apiKey
    })
    return apiKey
}

async function getApiKey(message: string, signature: string) {
    const address = message.split("\n")[1].toLowerCase()
    const subscribed = await isSubscribed(toAddress, minAmount, address)
    if (!subscribed) {
        return errorResponse({ message: "address is not subscribed" })
    }
    if(!verifySig(message, signature)){
        return errorResponse({ message: "bad signature" })
    }
    const apiKey = await generateApiKey(address)
    
    return successResponse({apiKey})
}

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const {message, signature} = JSON.parse(event.body!)
    return getApiKey(message, signature)
}

export default wrap(handler)