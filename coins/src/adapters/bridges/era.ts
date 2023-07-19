import axios from "axios";
import { fetch, formatExtraTokens } from "../utils";

async function getTokens() {
  let page = 0
  let limit = 255
  const tokens = []
  let isMore = false
  do {
    const { data: { result } } = await axios.post(`https://mainnet.era.zksync.io`,{"jsonrpc": "2.0", "id": 1, "method": "zks_getConfirmedTokens", "params": [ page, limit ]})
    page++
    tokens.push(...result)
    isMore = result.length === limit
  } while (isMore)
  return tokens
}

export default async function bridge() {
  const bridge = await getTokens() as any[];

  return bridge
    .map(({ l1Address, l2Address, symbol, decimals, }) => {
      return {
        from: `era:${l2Address}`,
        to: `ethereum:${l1Address}`,
        symbol,
        decimals,
      };
    })
    .concat(extraTokens);
}

const extraTokens = formatExtraTokens("era", []);
