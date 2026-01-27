import type { IParentProtocol } from "../protocols/types";
import { sortHallmarks } from "../protocols/data";
import { IProtocolResponse, ICurrentChainTvls, IRaise } from "../types";
import { getObjectKeyCount } from "../api2/utils";

export interface ICombinedTvls {
  chainTvls: {
    [chain: string]: {
      tvl: {
        [date: number]: number;
      };
      tokensInUsd: {
        [date: number]: {
          [token: string]: number;
        };
      };
      tokens: {
        [date: number]: {
          [token: string]: number;
        };
      };
    };
  };
  tokensInUsd: {
    [date: number]: {
      [token: string]: number;
    };
  };
  tokens: {
    [date: number]: {
      [token: string]: number;
    };
  };
  tvl: {
    [date: number]: number;
  };
}

export async function craftParentProtocolInternal({
  parentProtocol,
  skipAggregatedTvl,
  childProtocolsTvls,
  fetchMcap,
  parentRaises,
  feMini = false,
}: {
  parentProtocol: IParentProtocol;
  skipAggregatedTvl: boolean;
  fetchMcap: Function;
  childProtocolsTvls: Array<IProtocolResponse>;
  parentRaises: IRaise[];
  feMini?: boolean;
}) {

  // debug to find bad data
  // -- debug start
  // data can be null because we dont have token breakdown for some protocols

  /* 
  const isBadDataFormat = (data: any) => {
    if (typeof data !== "object" || !data) return true;
    const { tvl, tokensInUsd, tokens } = data;
    if (!Array.isArray(tvl)) return 'tvl'
    if (!Array.isArray(tokensInUsd)) return 'tokensInUsd'
    if (!Array.isArray(tokens)) return 'tokens'
    return false;
  }
  
  childProtocolsTvls.forEach((protocolData: any) => {
    if (protocolData.message) {
      console.error(`Error building parent protocol: ${parentProtocol.name}`);
      console.error(`Error in protocol data for message ${protocolData.name}: ${protocolData.message}`);
      return;
    }

    const badData = isBadDataFormat(protocolData);
    if (badData) {
      console.error(`Error building parent protocol: ${parentProtocol.name}`);
      console.error(`Error in protocol data for ${protocolData.name}: ${badData}`)
    }

    Object.entries(protocolData.chainTvls ?? {}).forEach(([chain, chainData]: any) => {
      const badChainData = isBadDataFormat(chainData);
      if (badChainData) {
        console.error(`Error building parent protocol: ${parentProtocol.name}`);
        console.error(`Error in chain data for ${chain} in protocol ${protocolData.name}: ${badChainData}`)
      }
    });
  }) */
  // -- debug end



  let { chainTvls, tokensInUsd, tokens, tvl } = mergeChildProtocolData(childProtocolsTvls);


  if (skipAggregatedTvl) {
    tvl = []
    tokensInUsd = []
    tokens = []
  }

  // TOTAL TVL OF EACH CHAIN
  const currentChainTvls: ICurrentChainTvls = {};
  for (const name in chainTvls) {
    if (chainTvls[name].tvl?.length)
      currentChainTvls[name] = chainTvls[name].tvl[chainTvls[name].tvl.length - 1].totalLiquidityUSD;
  }

  const [tokenMcap] = await Promise.all([fetchMcap(parentProtocol.gecko_id)]);

  const response: IProtocolResponse = {
    ...parentProtocol,
    currentChainTvls,
    chainTvls,
    tokens,
    tokensInUsd,
    tvl,
    isParentProtocol: true,
    raises: childProtocolsTvls?.reduce((acc, curr) => {
      acc = [...acc, ...(curr.raises || [])];
      return acc;
    }, parentRaises as Array<IRaise>),
    symbol:
      parentProtocol.symbol ??
      (parentProtocol.gecko_id
        ? childProtocolsTvls.find((p) => p.gecko_id === parentProtocol.gecko_id)?.symbol
        : null) ??
      null,
    treasury: parentProtocol.treasury ?? childProtocolsTvls.find((p) => p.treasury)?.treasury ?? null,
    mcap: tokenMcap ?? childProtocolsTvls.find((p) => p.mcap)?.mcap ?? null,
    ...(parentProtocol.deprecated || childProtocolsTvls.every((p) => p.deprecated) ? { deprecated: true } : {}),
  };

  if (feMini) {
    for (const chain in response.chainTvls) {
      response.chainTvls[chain].tokens = null;
      response.chainTvls[chain].tokensInUsd = null;

      if (Array.isArray(response.chainTvls[chain].tvl)) {
        const transformedTvl: any = []
        for (const record of response.chainTvls[chain].tvl) {
          transformedTvl.push([record.date, record.totalLiquidityUSD])
        }
        response.chainTvls[chain].tvl = transformedTvl;
      }
    }

    response.tokensInUsd = null
    response.tokens = null

    if (Array.isArray(response.tvl)) {
      const transformedTvl: any = []
      for (const record of response.tvl) {
        transformedTvl.push([record.date, record.totalLiquidityUSD])
      }
      response.tvl = transformedTvl;
    }

  } else {
    // Filter overall tokens, tokens in usd by date if data is more than 6MB
    let keyCount = getObjectKeyCount(response);
    if (keyCount >= 1.5e5) { // there are more than 150k keys
      for (const chain in response.chainTvls) {
        response.chainTvls[chain].tokens = null;
        response.chainTvls[chain].tokensInUsd = null;
      }
    }
  }

  if (childProtocolsTvls.length > 0) {
    response.otherProtocols = childProtocolsTvls[0].otherProtocols;

    // show all hallmarks of child protocols on parent protocols chart
    const hallmarks: any = []
    childProtocolsTvls.forEach((module) => {
      if (module.hallmarks)
        hallmarks.push(...module.hallmarks);
    });

    sortHallmarks(hallmarks);
    response.hallmarks = hallmarks
  }

  return response;
}

function mergeChildProtocolData(childProtocolsTvls: any) {
  childProtocolsTvls = childProtocolsTvls.filter((prot: any) => (prot.message ? false : true))
  let latestTS: number

  // find the last record timestamp among all child protocols
  childProtocolsTvls.forEach(({ tvl = [] }: any) => {
    if (tvl.length) {
      if (!latestTS)
        latestTS = tvl[0].date
      tvl.forEach(({ date }: any) => {
        if (date > latestTS) latestTS = date
      })
    }
  })

  childProtocolsTvls.map((protocolData: any) => {
    if (protocolData.excludeTvlFromParent) return;
    const excludedSet = new Set<string>()
    if (protocolData.tokensExcludedFromParent) {
      Object.values(protocolData.tokensExcludedFromParent).flat().forEach((token: any) => {
        excludedSet.add(token.toUpperCase())
      })
    }


    mappifyTVLRecordsAndExcludeTokens(protocolData, excludedSet)
    Object.values(protocolData.chainTvls ?? {}).forEach((chainData: any) => {
      mappifyTVLRecordsAndExcludeTokens(chainData, excludedSet)
    })
  })

  const finalData: any = {
    tvl: {},
    tokensInUsd: {},
    tokens: {},
    chainTvls: {},
  }

  const tvlKeys = ['tvl', 'tokensInUsd', 'tokens']

  childProtocolsTvls.forEach((protocolData: any) => {
    tvlKeys.forEach((key) => {
      finalData[key] = addDataToMap(finalData[key], protocolData[key])
    })

    Object.entries(protocolData.chainTvls ?? {}).forEach(([chain, chainData]: any) => {
      tvlKeys.forEach((key) => {
        if (!finalData.chainTvls[chain]) finalData.chainTvls[chain] = {}
        finalData.chainTvls[chain][key] = addDataToMap(finalData.chainTvls[chain][key], chainData[key])
      })
    })
  })


  // turn all the date maps into arrays
  tvlKeys.forEach((key) => {
    finalData[key] = Object.values(finalData[key])
  })

  Object.values(finalData.chainTvls).forEach((chainData: any) => {
    tvlKeys.forEach((key) => {
      chainData[key] = Object.values(chainData[key])
    })
  })

  return finalData


  function mappifyTVLRecordsAndExcludeTokens(protocolData: any, excludedSet: Set<string>) {
    const { tvl, tokensInUsd, tokens } = protocolData;
    const tvlMap = getDateMapWithMissingData(tvl);
    const tokensInUsdMap = getDateMapWithMissingData(tokensInUsd);
    const tokensMap = getDateMapWithMissingData(tokens);


    removeExcludedTokens({ tvlMap, tokensInUsdMap, tokensMap }, excludedSet);
    protocolData.tvl = tvlMap;
    protocolData.tokensInUsd = tokensInUsdMap;
    protocolData.tokens = tokensMap;
  }

  function removeExcludedTokens({ tvlMap, tokensInUsdMap, tokensMap }: any, excludedSet: Set<string>) {
    if (!excludedSet?.size) return;

    Object.values(tokensInUsdMap).forEach((record: any) => {
      const tokensObj = record.tokens
      const tvlRecord = tvlMap[record.date]
      Object.keys(tokensObj).forEach((token) => {
        if (excludedSet.has(token)) {
          if (tvlRecord) tvlRecord.totalLiquidityUSD -= tokensObj[token]
          delete tokensObj[token]
        }
      })
    })

    Object.values(tokensMap).forEach((record: any) => {
      const tokensObj = record.tokens
      Object.keys(tokensObj).forEach((token) => {
        if (excludedSet.has(token)) {
          delete tokensObj[token]
        }
      })
    })
  }


  function getDateMapWithMissingData(data: any[] = []): { [date: number]: any } {
    if (!data || data.length === 0) return {};
    const dateMap: { [date: number]: any } = {}
    data.sort((a, b) => a.date - b.date) // sort by date

    const recordCount = data.length
    if (recordCount === 0) return dateMap;


    // for daily tvl data, the last entry is the latest hourly record. if that is the case, we need to align that timestamp with latest hourly record of other child protocols
    let newestRecord = data[data.length - 1]
    const currentDayStartUTC = getStartOfDayTimestamp(Math.floor(Date.now() / 1000))
    const isTodayHourlyData = newestRecord.date >= currentDayStartUTC
    if (isTodayHourlyData) {
      newestRecord.date = latestTS
    } else {  // if the lastst hourly record is not for today, we need to align it with the start of the day of the last record
      newestRecord.date = getStartOfDayTimestamp(newestRecord.date)
    }


    // turn the data into a map
    let lastRecordWithDate = data[0]
    data.forEach((record, idx) => {
      const isLastRecord = idx === recordCount - 1

      // if it is not an hourly tvl data, we need to round the timestamp to the start of the day, we leave the last record as is (as it can be the latest hourly record)
      if (!isLastRecord) {
        record.date = getStartOfDayTimestamp(record.date)
      }

      dateMap[record.date] = record
    })


    // we fill missing data only for daily tvl data
    let nextDateTS = lastRecordWithDate.date + 86400
    while (nextDateTS < latestTS) {
      if (!dateMap[nextDateTS]) dateMap[nextDateTS] = { ...clone(lastRecordWithDate), date: nextDateTS }  // to avoid mutating the same object, can turn into a bug in the case of excluding tvl if we operate on the same record again and again
      lastRecordWithDate = dateMap[nextDateTS]
      nextDateTS += 86400
    }

    // if the last record is not the latest timestamp, we need to add that too
    if (!dateMap[latestTS]) dateMap[latestTS] = { ...clone(lastRecordWithDate), date: latestTS }


    return dateMap;
  }

  function clone(obj: any) {
    return JSON.parse(JSON.stringify(obj))
  }

  function addDataToMap(acc: any = {}, curr: any) {
    Object.keys(curr).forEach((key) => {
      acc[key] = mergeMapRecords(acc[key], curr[key])
    })
    return acc


    function mergeMapRecords(original: any = {}, toMerge: any) {
      Object.keys(toMerge).forEach((key) => {
        if (key === 'date') {
          original[key] = toMerge[key]
        } else if (typeof toMerge[key] === 'object') {
          original[key] = mergeMapRecords(original[key], toMerge[key])
        } else if (typeof toMerge[key] === 'number') {
          original[key] = (original[key] ?? 0) + toMerge[key]
        }
      })
      return original
    }
  }
}

const tsNoonMap: { [key: number]: number } = {}

function getStartOfDayTimestamp(ts: number) {
  if (!tsNoonMap[ts]) {
    const date = new Date(ts * 1000)
    date.setUTCHours(0, 0, 0, 0)
    tsNoonMap[ts] = Math.floor(date.getTime() / 1000)
  }
  return tsNoonMap[ts]
}
