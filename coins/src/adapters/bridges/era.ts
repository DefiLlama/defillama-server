import axios from "axios";
import { formatExtraTokens } from "../utils";

async function getTokens() {
  let page = 0;
  let limit = 255;
  const tokens = [];
  let isMore = false;
  do {
    const {
      data: { result },
    } = await axios.post(`https://mainnet.era.zksync.io`, {
      jsonrpc: "2.0",
      id: 1,
      method: "zks_getConfirmedTokens",
      params: [page, limit],
    });
    page++;
    tokens.push(...result);
    isMore = result.length === limit;
  } while (isMore);
  return tokens;
}

async function getTokens2() {
  const res = await axios.get(
    `https://firestore.googleapis.com/v1/projects/token-library/databases/(default)/documents/v1/collection`,
  );
  return res.data.fields[324].arrayValue.values.map((m: any) => ({
    from: `era:${m.mapValue.fields.l2Address.stringValue}`,
    to: `ethereum:${m.mapValue.fields.l1Address.stringValue}`,
    symbol: m.mapValue.fields.symbol.stringValue,
    decimals: Number(m.mapValue.fields.decimals.integerValue),
  }));
}

export default async function bridge() {
  const bridge = (await getTokens()) as any[];
  return bridge
    .map(({ l1Address, l2Address, symbol, decimals }) => {
      return {
        from: `era:${l2Address}`,
        to: `ethereum:${l1Address}`,
        symbol,
        decimals,
      };
    })
    .concat(extraTokens)
    .concat(await getTokens2());
}

const extraTokens = formatExtraTokens("era", []);
