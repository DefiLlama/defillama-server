import { craftProtocolsResponse } from "./getProtocols";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { store } from "./utils/s3";
import { constants, brotliCompressSync } from "zlib";
import { getTvlChange, ProtocolTvlsChange } from "./utils/getTvlChange";

function compress(data: string) {
  return brotliCompressSync(data, {
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
    [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
  });
}

const handler = async (_event: any) => {
  const response = await craftProtocolsResponse(true);
  const trimmedResponse = await Promise.all(response.map(async (protocol) => {
  const protocolTvlsChange: ProtocolTvlsChange = await getTvlChange(protocol.id)
    return {
      category: protocol.category,
      chains: protocol.chains,
      chainTvls: protocol.chainTvls,
      change_1d: protocolTvlsChange.change_1d,
      change_7d: protocolTvlsChange.change_7d,
      change_1m: protocolTvlsChange.change_1m,
      listedAt: protocol.listedAt,
      mcap: protocol.mcap,
      name: protocol.name,
      symbol: protocol.symbol,
      tvl: protocol.tvl,
      chainTvlsChange: protocolTvlsChange.chainTvlsChange
    }
  }));

  const noChainResponse = trimmedResponse.filter((p) => p.category !== "Chain");
  const chains = {} as { [chain: string]: number };
  const protocolCategoriesSet = new Set();
  noChainResponse.forEach((p) => {
    protocolCategoriesSet.add(p.category);
    p.chains.forEach((c: string) => {
      chains[c] = (chains[c] ?? 0) + (p.chainTvls[c] || 0);
    });
  });

  const compressedV2Response = compress(
    JSON.stringify({
      protocols: noChainResponse,
      chains: Object.entries(chains)
        .sort((a, b) => b[1] - a[1])
        .map((c) => c[0]),
      protocolCategories: [...protocolCategoriesSet].filter(
        (category) => category
      ),
    })
  );
  await store("lite/protocols2", compressedV2Response, true);
};

export default wrapScheduledLambda(handler);
