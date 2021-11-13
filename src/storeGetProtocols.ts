import { craftProtocolsResponse } from "./getProtocols";
import { wrapScheduledLambda } from "./utils/wrap";
import { store } from "./utils/s3";
import { constants, brotliCompressSync } from 'zlib'

function compress(data: string) {
  return brotliCompressSync(data, {
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
    [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
  })
}

const handler = async (_event: any) => {
  const response = await craftProtocolsResponse()
  const trimmedResponse = response.map(protocol => ({
    name: protocol.name,
    symbol: protocol.symbol,
    "category": protocol.category,
    "chains": protocol.chains,
    tvl: protocol.tvl,
    chainTvls: protocol.chainTvls,
    "change_1d": protocol["change_1d"],
    "change_7d": protocol["change_7d"],
    mcaptvl: protocol.mcap ? protocol.mcap / protocol.tvl : undefined,
  }))
  const compressedRespone = compress(JSON.stringify(trimmedResponse))

  await store('lite/protocols', compressedRespone, true)
  const chains = {} as { [chain: string]: number }
  trimmedResponse.forEach(p => p.chains.forEach((c: string) => {
    chains[c] = (chains[c] ?? 0) + p.chainTvls[c]
  }))
  const compressedV2Respone = compress(JSON.stringify({
    protocols: trimmedResponse,
    chains: ["All"].concat(Object.entries(chains).sort((a,b)=>b[1]-a[1]).map(c=>c[0]))
  }))
  await store('lite/protocols2', compressedV2Respone, true)
};

export default wrapScheduledLambda(handler);
