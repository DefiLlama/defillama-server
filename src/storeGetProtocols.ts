import { craftProtocolsResponse } from "./getProtocols";
import { wrapScheduledLambda } from "./utils/wrap";
import { store } from "./utils/s3";
import { constants, brotliCompressSync } from 'zlib'

const handler = async (_event: any) => {
  const response = JSON.stringify(await craftProtocolsResponse())
  const compressedRespone = brotliCompressSync(response, {
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
    [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
  })
  
  await store('protocols.json', compressedRespone, {
    CacheControl: `max-age=${10*60}`, // 10 minutes
    ContentEncoding: 'br',
    ContentType: "application/json"
  })
};

export default wrapScheduledLambda(handler);
