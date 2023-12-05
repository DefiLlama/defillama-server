import { fetchTvls } from "./outgoing";
import { fetchIncoming } from "./incoming";
import { fetchMinted } from "./native";
import { fetchMetadata } from "./metadata";
import { ChainData, DollarValues, TokenTvlData } from "./types";
import BigNumber from "bignumber.js";
import { ownTokens, tokenFlowCategories, zero } from "./constants";
import { Chain } from "@defillama/sdk/build/general";

type TranslatedData = { [chain: string]: any };

export default async function main() {
  const { data: canonical } = await fetchTvls({ isCanonical: true });
  let { tvlData: native, mcapData } = await fetchMinted({ chains: Object.keys(canonical) });
  let { data: outgoing, native: adjustedNativeBalances } = await fetchTvls({ mcapData, native });
  if (!adjustedNativeBalances) throw new Error(`Adjusting for mcaps has failed, debug manually`);
  native = adjustedNativeBalances;
  const incoming = await fetchIncoming({ chains: Object.keys(canonical) });
  const { data: protocols } = await fetchTvls({ isCanonical: true, isProtocol: true });
  // const metadata = await Promise.all(Object.keys(canonical).map((chain: string) => fetchMetadata(chain)));

  const chains = translateToChainData({
    canonical,
    incoming,
    outgoing,
    native,
    ownTokens: {},
    // metadata,
  });

  return translateProtocols(chains, protocols);
}

function translateProtocols(chains: TranslatedData, protocols: TokenTvlData): TranslatedData {
  Object.keys(protocols).map((pid: string) => {
    const total = Object.values(protocols[pid]).reduce((p: any, c: any) => c.plus(p), zero);
    const canonical = { total, breakdown: protocols[pid] };
    chains[pid] = {
      canonical,
      incoming: {},
      native: {},
      outgoing: {},
      total: canonical,
    };
  });

  return chains;
}
function translateToChainData(data: ChainData): TranslatedData {
  const translatedData: { [chain: Chain]: { [category: string]: { breakdown: any; total: BigNumber } } } = {};
  const selectedChains: Chain[] = Object.keys(data.canonical);
  tokenFlowCategories.map((c: keyof ChainData) => processProperty(data, c));
  // processProperty(data, "metadata");
  processNetFlows();

  function processProperty(data: ChainData, key: keyof ChainData) {
    selectedChains.map((chain: Chain) => {
      if (!(chain in translatedData)) translatedData[chain] = {};
      if (!data[key] || !data[key][chain]) translatedData[chain][key] = { total: zero, breakdown: {} };
      if (chain in ownTokens && ownTokens[chain] in data[key][chain]) processOwnTokens(data, key, chain);
      if (!data[key][chain]) {
        console.log(` NULL ERROR: key: ${key}, chain: ${chain}`);
        return;
      }
      const total = Object.values(data[key][chain]).reduce((p: any, c: any) => c.plus(p), zero);
      translatedData[chain][key] = { total, breakdown: data[key][chain] };
    });
  }

  function processNetFlows() {
    Object.keys(translatedData).map((chain: Chain) => {
      let total: { breakdown: DollarValues; total: BigNumber } = { breakdown: {}, total: zero };
      Object.keys(translatedData[chain]).map((category: string) => {
        Object.keys(translatedData[chain][category].breakdown).map((symbol: string) => {
          if (!(symbol in total.breakdown)) total.breakdown[symbol] = zero;
          if (category == "outgoing")
            total.breakdown[symbol] = total.breakdown[symbol].minus(translatedData[chain][category].breakdown[symbol]);
          else
            total.breakdown[symbol] = total.breakdown[symbol].plus(translatedData[chain][category].breakdown[symbol]);
        });

        if (category == "outgoing") total.total = total.total.minus(translatedData[chain][category].total);
        else total.total = total.total.plus(translatedData[chain][category].total);
      });

      translatedData[chain].total = total;
    });
  }

  function processOwnTokens(data: ChainData, key: keyof ChainData, chain: Chain) {
    if (key == "outgoing") return;
    const ownToken = ownTokens[chain];
    const total = data[key][chain][ownToken];
    if (!translatedData[chain].ownTokens)
      translatedData[chain].ownTokens = { total: zero, breakdown: { [ownToken]: zero } };
    translatedData[chain].ownTokens.total.plus(total);
    translatedData[chain].ownTokens.breakdown[ownToken].plus(total);
    delete data[key][chain][ownToken];
  }

  return translatedData;
}
main(); // ts-node defi/l2/tvl.ts
