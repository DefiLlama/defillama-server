import { fetchOutgoing } from "./outgoing";
import { fetchIncoming } from "./incoming";
import { fetchMinted } from "./minted";
import { fetchMetadata } from "./metadata";
import { ChainData, DollarValues, TokenTvlData } from "./types";
import BigNumber from "bignumber.js";
import { tokenFlowCategories, zero } from "./constants";
import { Chain } from "@defillama/sdk/build/general";

type TranslatedData = { [chain: string]: any };
export async function main() {
  const outgoing = await fetchOutgoing();
  const canonical = await fetchOutgoing({ isCanonical: true });
  const incoming = await fetchIncoming({ chains: Object.keys(canonical) });
  const native = await fetchMinted({ chains: Object.keys(canonical) });
  // const metadata = await Promise.all(Object.keys(canonical).map((chain: string) => fetchMetadata(chain)));
  const protocols = await fetchOutgoing({ isCanonical: true, isProtocol: true });

  const chains = translateToChainData({
    canonical,
    incoming,
    outgoing,
    native,
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
      netflows: canonical,
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
      if (!data[key] || !data[key][chain]) {
        translatedData[chain][key] = { total: zero, breakdown: {} };
      } else {
        const total = Object.values(data[key][chain]).reduce((p: any, c: any) => c.plus(p), zero);
        translatedData[chain][key] = { total, breakdown: data[key][chain] };
      }
    });
  }

  function processNetFlows() {
    Object.keys(translatedData).map((chain: Chain) => {
      let netflows: { breakdown: DollarValues; total: BigNumber } = { breakdown: {}, total: zero };
      Object.keys(translatedData[chain]).map((category: string) => {
        Object.keys(translatedData[chain][category].breakdown).map((symbol: string) => {
          if (!(symbol in netflows.breakdown)) netflows.breakdown[symbol] = zero;
          if (category == "outgoing")
            netflows.breakdown[symbol] = netflows.breakdown[symbol].minus(
              translatedData[chain][category].breakdown[symbol]
            );
          else
            netflows.breakdown[symbol] = netflows.breakdown[symbol].plus(
              translatedData[chain][category].breakdown[symbol]
            );
        });

        if (category == "outgoing") netflows.total = netflows.total.minus(translatedData[chain][category].total);
        else netflows.total = netflows.total.plus(translatedData[chain][category].total);
      });

      translatedData[chain].netflows = netflows;
    });
  }

  return translatedData;
}
