import { craftProtocolsResponse } from "./getProtocols";
import { wrapScheduledLambda } from "./utils/wrap";
import { store } from "./utils/s3";
import { constants, brotliCompressSync } from 'zlib'

const handler = async (_event: any) => {
  const response = await craftProtocolsResponse()
  const trimmedResponse = response.map(protocol=>({
    name: protocol.name,
    symbol: protocol.symbol,
    "category": protocol.category,
    "chains": protocol.chains,
    tvl: protocol.tvl,
    chainTvls: protocol.chainTvls,
    "change_1d": protocol["change_1d"],
    "change_7d": protocol["change_7d"],
    mcaptvl: protocol.mcap? protocol.mcap/protocol.tvl:undefined,
  }))
  const compressedRespone = brotliCompressSync(JSON.stringify(trimmedResponse), {
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
    [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
  })
  
  await store('lite/protocols', compressedRespone, true)
};

export default wrapScheduledLambda(handler);
