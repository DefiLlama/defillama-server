import { _InternalProtocolMetadataMap } from "../protocols/data";
import { convertSymbols } from "./symbols/convert";

export function normalizeEthereum(balances: { [symbol: string]: number }) {
  if (typeof balances === "object") {
    convertSymbols(balances);
  }
  const formattedBalances: { [symbol: string]: number } = {};

  for (const b in balances) {
    if (typeof balances[b] === "string") {
      formattedBalances[b] = Number(Number(balances[b]).toFixed(5));
    } else {
      formattedBalances[b] = Number(balances[b].toFixed(5));
    }
  }

  return balances && formattedBalances;
}

export function selectChainFromItem(item: any, normalizedChain: string) {
  let altChainName = undefined;
  if (normalizedChain.startsWith("avax")) {
    altChainName = normalizedChain.replace("avax", "avalanche");
  } else if (normalizedChain.startsWith("avalanche")) {
    altChainName = normalizedChain.replace("avalanche", "avax");
  } else {
    return item[normalizedChain];
  }
  return item[normalizedChain] ?? item[altChainName];
}
