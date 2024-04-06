import { fetchTvls } from "./outgoing";
import { fetchIncoming } from "./incoming";
import { fetchMinted } from "./native";
import { fetchMetadata } from "./metadata";
import { ChainData, DollarValues, FinalData } from "./types";
import BigNumber from "bignumber.js";
import { gasTokens, ownTokens, tokenFlowCategories, zero } from "./constants";
import { Chain } from "@defillama/sdk/build/general";
import { getMcaps } from "./utils";
import { getCurrentUnixTimestamp } from "../src/utils/date";
import { flagChainErrors, verifyChanges } from "./test";
import setEnvSecrets from "../src/utils/shared/setEnvSecrets";

export default async function main(timestamp?: number) {
  await setEnvSecrets();
  const { data: canonical } = await fetchTvls({ isCanonical: true, timestamp });
  let [{ tvlData: native, mcapData }, incoming, { data: protocols }] = await Promise.all([
    fetchMinted({
      chains: Object.keys(canonical),
      timestamp,
    }),
    fetchIncoming({ canonical, timestamp }),
    fetchTvls({ isCanonical: true, isProtocol: true, timestamp }),
  ]);
  let { data: outgoing, native: adjustedNativeBalances } = await fetchTvls({ mcapData, native, timestamp });

  if (!adjustedNativeBalances) throw new Error(`Adjusting for mcaps has failed, debug manually`);
  native = adjustedNativeBalances;

  Object.keys(canonical).map((c: string) => {
    if (c in incoming && c in native) return;
    delete outgoing[c];
    delete incoming[c];
    delete native[c];
  });

  Object.keys(protocols).map((pid: string) => {
    canonical[pid] = protocols[pid];
  });

  const chains = await translateToChainData({
    canonical,
    incoming,
    outgoing,
    native,
    ownTokens: {},
  });

  // await verifyChanges(chains);
  // flagChainErrors(chains);

  return chains;
}

async function translateToChainData(
  data: ChainData,
  timestamp: number = getCurrentUnixTimestamp()
): Promise<FinalData> {
  const nativeTokenKeys = Object.keys(ownTokens).map((chain: string) => `${chain}:${ownTokens[chain].address}`);
  const nativeTokenSymbols = Object.keys(ownTokens).map((chain: string) => ownTokens[chain].ticker);
  const mcapsPromise = getMcaps(nativeTokenKeys, timestamp);
  const nativeTokenTotalValues: any = {};

  let translatedData: any = {};
  const selectedChains: Chain[] = Object.keys(data.canonical);
  aggregateNativeTokens();

  await Promise.all(tokenFlowCategories.map((c: keyof ChainData) => processProperty(data, c)));
  // processProperty(data, "metadata");
  combineThirdPartyFlows();
  processNetFlows();

  function aggregateNativeTokens() {
    tokenFlowCategories.map((key: keyof ChainData) => {
      selectedChains.map((chain: Chain) => {
        if (!(chain in data[key])) return;
        Object.keys(data[key][chain]).map((symbol: string) => {
          if (!nativeTokenSymbols.includes(symbol)) return;
          if (!(symbol in nativeTokenTotalValues)) nativeTokenTotalValues[symbol] = zero;
          nativeTokenTotalValues[symbol] = nativeTokenTotalValues[symbol].plus(data[key][chain][symbol]);
        });
      });
    });
  }

  async function processProperty(data: ChainData, key: keyof ChainData) {
    await Promise.all(
      selectedChains.map(async (chain: Chain) => {
        if (!(chain in data[key])) return;
        if (!(chain in translatedData)) translatedData[chain] = {};
        if (!data[key] || !data[key][chain]) translatedData[chain][key] = { total: zero, breakdown: {} };
        if (chain in ownTokens && ownTokens[chain].ticker in data[key][chain]) await processOwnTokens(data, key, chain);
        const total = Object.values(data[key][chain]).reduce((p: any, c: any) => c.plus(p), zero);
        translatedData[chain][key] = { total, breakdown: data[key][chain] };
      })
    );
  }

  function processNetFlows() {
    Object.keys(translatedData).map((chain: Chain) => {
      let total: { breakdown: DollarValues; total: BigNumber } = { breakdown: {}, total: zero };
      Object.keys(translatedData[chain]).map((category: string) => {
        if (category == "ownTokens") return;
        Object.keys(translatedData[chain][category].breakdown).map((symbol: string) => {
          if (!(symbol in total.breakdown)) total.breakdown[symbol] = zero;
          total.breakdown[symbol] = total.breakdown[symbol].plus(translatedData[chain][category].breakdown[symbol]);
        });

        total.total = total.total.plus(translatedData[chain][category].total);
      });

      translatedData[chain].total = total;
    });
  }

  function combineThirdPartyFlows() {
    Object.keys(translatedData).map((chain: Chain) => {
      const breakdown: { [symbol: string]: BigNumber } = {};
      if (!("incoming" in translatedData[chain])) return;
      Object.keys(translatedData[chain].incoming.breakdown).map((symbol: string) => {
        if (gasTokens[chain] && [gasTokens[chain], `W${gasTokens[chain]}`].includes(symbol)) {
          return;
        }
        breakdown[symbol] = translatedData[chain].incoming.breakdown[symbol];
      });
      Object.keys(translatedData[chain].outgoing.breakdown).map((symbol: string) => {
        if (gasTokens[chain] && [gasTokens[chain], `W${gasTokens[chain]}`].includes(symbol)) {
          return;
        }
        if (!(symbol in breakdown)) return;
        breakdown[symbol] = breakdown[symbol].minus(translatedData[chain].incoming.breakdown[symbol]);
        // else breakdown[symbol] = BigNumber(-1).times(translatedData[chain].outgoing.breakdown[symbol]);
      });
      const total = Object.values(breakdown).reduce((p: BigNumber, c: BigNumber) => p.plus(c), zero);
      translatedData[chain].thirdParty = { total, breakdown };
      delete translatedData[chain].incoming;
      delete translatedData[chain].outgoing;
    });
  }

  async function processOwnTokens(data: ChainData, key: keyof ChainData, chain: Chain) {
    if (key == "outgoing") return;
    const ownToken = ownTokens[chain];
    const total = data[key][chain][ownToken.ticker];
    if (!translatedData[chain].ownTokens)
      translatedData[chain].ownTokens = { total: zero, breakdown: { [ownToken.ticker]: zero } };
    const percOnThisChain = data[key][chain][ownToken.ticker].div(nativeTokenTotalValues[ownToken.ticker]);
    const mcaps = await mcapsPromise;
    const address = Object.keys(mcaps).find((k: string) => k.startsWith(chain));
    const mcap = address ? mcaps[address].mcap : total;
    const thisAssetMcap = BigNumber.min(mcap, total).times(percOnThisChain);
    translatedData[chain].ownTokens.total = translatedData[chain].ownTokens.total.plus(thisAssetMcap);
    translatedData[chain].ownTokens.breakdown[ownToken.ticker] =
      translatedData[chain].ownTokens.breakdown[ownToken.ticker].plus(thisAssetMcap);
    delete data[key][chain][ownToken.ticker];
  }

  return translatedData;
}
