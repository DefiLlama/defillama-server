
import axios from "axios";
import { graph, util } from "@defillama/sdk";

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



export async function getTokenInfo(token: string) {
  const query = `{
  coinMetadata(coinType:"${token}") {
    decimals
    symbol
  }
}`
  const { coinMetadata: { symbol, decimals } } = await graph.request(graphEndpoint(), query)
  return { decimals, symbol }
}

export async function queryEvents({ eventType, transform = (i: any) => i }: any) {
  let filter: any = {}
  if (eventType) filter.MoveEventType = eventType
  const items = []
  let cursor = null
  do {
    const { data, nextCursor, hasNextPage } = await call('suix_queryEvents', [filter, cursor], { withMetadata: true, })
    cursor = hasNextPage ? nextCursor : null
    items.push(...data)
  } while (cursor)
  return items.map(i => i.parsedJson).map(transform)
}

export async function getObjects(objectIds: string[]): Promise<any[]> {
  if (objectIds.length > 9) {
    const chunks = util.sliceIntoChunks(objectIds, 9)
    const res = []
    for (const chunk of chunks) res.push(...(await getObjects(chunk)))
    return res
  }
  const {
    data: { result }
  } = await axios.post(endpoint(), {
    jsonrpc: "2.0", id: 1, method: 'sui_multiGetObjects', params: [objectIds, {
      "showType": true,
      "showOwner": true,
      "showContent": true,
    }],
  })
  return objectIds.map(i => result.find((j: any) => j.data?.objectId === i)?.data?.content)
}