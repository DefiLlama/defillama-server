import { getChainDisplayName, chainCoingeckoIds, transformNewChainName, extraSections } from "./utils/normalizeChain";
import { processProtocols, TvlItem } from "./storeGetCharts";
import type { Protocol } from "./protocols/data";
import { storeR2JSONString } from "./utils/r2";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { storeRouteData } from "./api2/cache/file-cache";

interface SumDailyTvls {
  [timestamp: number]: {
    [lang: string]: number | undefined;
  };
}

interface LanguageProtocols {
  [lang: string]: Set<string>;
}

function sumBasic(total: SumDailyTvls, lang: string, time: number, tvl: number) {
  if (total[time] === undefined) {
    total[time] = {};
  }
  total[time][lang] = (total[time][lang] ?? 0) + tvl;
}

function sum(
  total: SumDailyTvls,
  lang: string,
  time: number,
  tvl: number,
  languageProtocols: LanguageProtocols,
  protocol: string
) {
  sumBasic(total, lang, time, tvl);

  if (languageProtocols[lang] == undefined) {
    languageProtocols[lang] = new Set();
  }
  languageProtocols[lang].add(protocol);
}

const chainToLang = {
  Solana: "Rust",
  Terra: "Rust",
  Tron: "Solidity",
  Bitcoin: "Bitcoin Script",
  NEO: "C#",
  Cardano: "Haskell",
  Lamden: "Python",
  Icon: "Java",
  Waves: "Ride",
  Elrond: "Rust",
} as {
  [chain: string]: string | undefined;
};

function defaultLang(chainName: string) {
  const chain = chainCoingeckoIds[chainName];
  if (chain === undefined) {
    return undefined;
  }
  if (chain.categories?.includes("EVM")) {
    return "Solidity";
  }
  return chainToLang[chainName];
}

export async function storeLangs({ ...options }: any = {}) {
  const sumDailyTvls = {} as SumDailyTvls;
  const languageProtocols = {} as LanguageProtocols;
  const sumDailySolanaOpenSourceTvls = {} as SumDailyTvls;

  await processProtocols(
    async (timestamp: number, item: TvlItem, protocol: Protocol) => {
      const language = protocol.language;
      if (language !== undefined) {
        sum(sumDailyTvls, language, timestamp, item.tvl, languageProtocols, protocol.name);
      }
      const addData = (lang: string, timestamp: number, tvl: number, chain: string) => {
        if (language === undefined) {
          sum(sumDailyTvls, lang, timestamp, tvl, languageProtocols, protocol.name);
        }
        if (chain.toLowerCase() === "solana") {
          sumBasic(
            sumDailySolanaOpenSourceTvls,
            protocol.openSource ?? true ? "opensource" : "closedsource",
            timestamp,
            tvl
          );
        }
      };
      let hasAtLeastOneChain = false;
      Object.entries(item).forEach(([chain, tvl]) => {
        const formattedChainName = getChainDisplayName(chain, true);
        if (extraSections.includes(formattedChainName) || formattedChainName.includes("-")) {
          return;
        }
        const lang = defaultLang(formattedChainName);
        if (lang !== undefined) {
          hasAtLeastOneChain = true;
          addData(lang, timestamp, tvl, chain);
        }
      });
      if (hasAtLeastOneChain === false) {
        const chain = transformNewChainName(protocol.chain);
        const lang = defaultLang(chain);
        if (lang !== undefined) {
          addData(lang, timestamp, item.tvl, chain);
        }
      }
    },
    { includeBridge: false, ...options }
  );

  const data = {
    chart: sumDailyTvls,
    protocols: Object.fromEntries(Object.entries(languageProtocols).map((c) => [c[0], Array.from(c[1])])),
    sumDailySolanaOpenSourceTvls,
  }

  if (options.isApi2CronProcess) {
    await storeRouteData('langs', data)
    return;
  } else {
    await storeR2JSONString("temp/langs.json", JSON.stringify(data), 10 * 60);
  }
}

const handler = async (_event: AWSLambda.APIGatewayEvent) => {
  await storeLangs();
};

export default wrapScheduledLambda(handler);
