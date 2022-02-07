import { getClosestDayStartTimestamp, secondsInHour } from "./utils/date";
import { getChainDisplayName, chainCoingeckoIds, transformNewChainName, extraSections } from "./utils/normalizeChain";
import { getHistoricalTvlForAllProtocols } from "./storeGetCharts";
import { successResponse, wrap, IResponse } from "./utils/shared";

interface SumDailyTvls {
  [timestamp: number]:{
    [lang:string]: number | undefined;
  }
}

interface LanguageProtocols {
  [lang:string]: Set<string>
}

function sum(total:SumDailyTvls, lang:string, time:number, tvl:number, languageProtocols:LanguageProtocols, protocol:string){
    if(total[time] === undefined){
        total[time] = {}
    }
    total[time][lang]=(total[time][lang] ?? 0) + tvl

    if(languageProtocols[lang] == undefined){
      languageProtocols[lang] = new Set()
    }
    languageProtocols[lang].add(protocol);
}

const chainToLang = {
  "Solana": "Rust",
  "Terra": "Rust",
  "Tron": "Solidity",
  "Bitcoin": "Bitcoin Script",
  "NEO": "C#",
  "Cardano": "Haskell",
  "Lamden": "Python",
  "Waves": "Ride",
  "Elrond": "Rust",
} as {
  [chain:string]:string|undefined
}

function defaultLang(chainName:string){
    const chain = chainCoingeckoIds[chainName];
    if(chain === undefined){ return undefined }
    if(chain.categories?.includes("EVM")){
        return "Solidity"
    }
    return chainToLang[chainName]
}

const handler = async (
    _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const sumDailyTvls = {} as SumDailyTvls
  const languageProtocols = {} as LanguageProtocols
  
  const {historicalProtocolTvls, lastDailyTimestamp} = await getHistoricalTvlForAllProtocols();
  historicalProtocolTvls.forEach((protocolTvl) => {
    if (protocolTvl === undefined) {
      return;
    }
    let { historicalTvl, protocol, lastTimestamp } = protocolTvl;
    const lastTvl = historicalTvl[historicalTvl.length - 1];
    while (lastTimestamp < lastDailyTimestamp) {
      lastTimestamp = getClosestDayStartTimestamp(lastTimestamp + 24 * secondsInHour)
      historicalTvl.push({
        ...lastTvl,
        SK: lastTimestamp,
      });
    }
    let language = protocol.language
    historicalTvl.forEach((item) => {
      const timestamp = getClosestDayStartTimestamp(item.SK);
      if(language !== undefined){
        sum(sumDailyTvls, language, timestamp, item.tvl, languageProtocols, protocol.name);
        return
      }
      let hasAtLeastOneChain = false;
      Object.entries(item).forEach(([chain, tvl])=>{
        const formattedChainName = getChainDisplayName(chain, true)
        if(extraSections.includes(formattedChainName) || formattedChainName.includes("-")){
          return
        }
        const lang = defaultLang(formattedChainName)
        if(lang !== undefined){
          hasAtLeastOneChain = true;
          sum(sumDailyTvls, lang, timestamp, tvl, languageProtocols, protocol.name);
        }
      })
      if(hasAtLeastOneChain === false){
        const lang = defaultLang(transformNewChainName(protocol.chain))
        if(lang !== undefined){
            sum(sumDailyTvls, lang, timestamp, item.tvl, languageProtocols, protocol.name);
        }
      }
    });
  });
  return successResponse({
    chart: sumDailyTvls,
    protocols: Object.fromEntries(Object.entries(languageProtocols).map(c=>[c[0], Array.from(c[1])])) ,
  }, 10 * 60); // 10 mins cache
}
  
export default wrap(handler);