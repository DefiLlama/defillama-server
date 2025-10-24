
import axios from "axios";
import { graph } from "@defillama/sdk";

const endpoint = () => process.env.SUI_RPC ?? 'https://sui-rpc.publicnode.com'
export const graphEndpoint = (): string => "https://sui-mainnet.mystenlabs.com/graphql";

export async function getObject(objectId: any) {
  return (await call('sui_getObject', [objectId, {
    "showType": true,
    "showOwner": true,
    "showContent": true,
  }])).content
}

async function call(method: string, params: any, { withMetadata = false }: any = {}) {
  if (!Array.isArray(params)) params = [params]
  const { data: {
    result, error
  } } = await axios.post(endpoint(), { jsonrpc: "2.0", id: 1, method, params, })
  if (!result && error) throw new Error(`[sui] ${error.message}`)
  if (['suix_getAllBalances'].includes(method)) return result
  return withMetadata ? result : result.data
}


export async function getTokenSupply(token: string) {
  const query = `{
  coinMetadata(coinType:"${token}") {
    decimals
    symbol
    supply
  }
}`
  const { coinMetadata: { supply, decimals } } = await graph.request(graphEndpoint(), query)
  return supply / 10 ** decimals
}