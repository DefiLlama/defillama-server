import * as HyperExpress from "hyper-express";
import { cache, getCoinMarkets, getLastHourlyRecord, getLastHourlyTokensUsd, checkModuleDoubleCounted, protocolHasMisrepresentedTokens, } from "../cache";
import sluggify from "../../utils/sluggify";
import { cachedCraftProtocolV2 } from "../utils/craftProtocolV2";
import { cachedCraftParentProtocolV2 } from "../utils/craftParentProtocolV2";
import * as sdk from '@defillama/sdk'
import { get20MinDate } from "../../utils/shared";
import { craftProtocolsResponseInternal as craftAllProtocolResponse } from "../../getProtocols";
import type { IProtocol, IChain, } from "../../types";
import { craftChainsResponse } from "../../getChains";
import { getTokensInProtocolsInternal } from "../../getTokenInProtocols";


export default function setRoutes(webserver: HyperExpress.Server) {


  webserver.get("/protocol/:name", async (req, res) => getProtocolishData(req, res, { dataType: 'protocol', skipAggregatedTvl: false, useNewChainNames: false, }));
  webserver.get("/treasury/:name", async (req, res) => getProtocolishData(req, res, { dataType: 'treasury' }));
  webserver.get("/entity/:name", async (req, res) => getProtocolishData(req, res, { dataType: 'entities' }));
  webserver.get("/updatedProtocol/:name", async (req, res) => getProtocolishData(req, res, { dataType: 'protocol', useHourlyData: false, skipAggregatedTvl: req.query_parameters.includeAggregatedTvl !== 'true' }));
  webserver.get("/hourly/:name", async (req, res) => getProtocolishData(req, res, { dataType: 'protocol', useHourlyData: true, skipAggregatedTvl: false }));

  webserver.get("/protocols", async (req, res) => getAllProtocolishData(req, res, { dataType: 'protocol', includeTokenBreakdowns: false, useNewChainNames: false, }));
  webserver.get("/treasuries", async (req, res) => getAllProtocolishData(req, res, { dataType: 'treasury' }));
  webserver.get("/entities", async (req, res) => getAllProtocolishData(req, res, { dataType: 'entities' }));

  webserver.get('/chains', async (req, res) => getChainsData(req, res, { isV2: false }))
  webserver.get('/v2/chains', async (req, res) => getChainsData(req, res, { isV2: true }))

  webserver.get("/tvl/:name", async (req, res) => getProtocolTvl(req, res));
  webserver.get("/tokenProtocols/:symbol", async (req, res) => getTokenInProtocols(req, res));
  webserver.get("/config/smol/:protocol", async (req, res) => getSmolConfig(req, res));
}

async function getProtocolishData(req: HyperExpress.Request, res: HyperExpress.Response, { dataType, useHourlyData = false, skipAggregatedTvl = true, useNewChainNames = true }: GetProtocolishOptions) {
  try {
    let name = sluggify({ name: req.path_parameters.name } as any)
    const protocolData = (cache as any)[dataType + 'SlugMap'][name];
    res.setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Expires": get20MinDate()
    })

    // check if it is a parent protocol
    if (!protocolData && dataType === 'protocol') {
      const parentProtocol = (cache as any)['parentProtocolSlugMap'][name];
      if (parentProtocol) {
        const responseData = await cachedCraftParentProtocolV2({
          parentProtocol: parentProtocol,
          useHourlyData,
          skipAggregatedTvl,
        });
        return res.json(responseData);
      }
    }

    if (!protocolData) {
      res.status(404)
      return res.send('Not found', true)
    }
    const responseData = await cachedCraftProtocolV2({
      protocolData,
      useNewChainNames,
      useHourlyData,
      skipAggregatedTvl,
    });
    return res.json(responseData);
  } catch (e) {
    sdk.log(e)
    res.status(500)
    return res.send('Internal Error', true)
  }
}

// todo add code to read query parameter and include chain data if requested
async function getAllProtocolishData(req: HyperExpress.Request, res: HyperExpress.Response, { dataType, useNewChainNames = true, includeTokenBreakdowns = true, }: GetAllProtocolishOptions) {
  try {
    let protocolList: IProtocol[]
    switch (dataType) {
      case 'protocol':
        protocolList = cache.metadata.protocols
        break;
      case 'treasury':
        protocolList = cache.metadata.treasuries
        break;
      case 'entities':
        protocolList = cache.metadata.entities
        break;
      default:
        res.status(400)
        return res.send('Bad Request', true)
    }

    const data = await craftAllProtocolResponse(useNewChainNames, protocolList, includeTokenBreakdowns, {
      getCoinMarkets: getCoinMarkets as any,
      getLastHourlyRecord: getLastHourlyRecord as any,
      getLastHourlyTokensUsd: getLastHourlyTokensUsd as any,
    })

    if (dataType === 'protocol' && req.query_parameters.includeChains === 'true') {
      const chainData: IChain[] = await craftChainsResponse(false, false, {
        protocolList,
        getLastHourlyRecord: getLastHourlyRecord as any,
        checkModuleDoubleCounted: checkModuleDoubleCounted as any,
      })
      data.push(...(chainData as any))
    }

    res.setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Expires": getTimeInFutureMinutes(5) // cache for 5 minutes
    })

    if (!data) {
      res.status(500)
      return res.send('Error forming data', true)
    }
    return res.json(data);
  } catch (e) {
    sdk.log(e)
    res.status(500)
    return res.send('Internal Error', true)
  }
}

async function getChainsData(_req: HyperExpress.Request, res: HyperExpress.Response, { isV2 = false }: { isV2?: boolean }) {
  try {
    const protocolList: IProtocol[] = cache.metadata.protocols
    const chainData: IChain[] = await craftChainsResponse(isV2, isV2, {
      protocolList,
      getLastHourlyRecord: getLastHourlyRecord as any,
      checkModuleDoubleCounted: checkModuleDoubleCounted as any,
    })

    res.setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Expires": getTimeInFutureMinutes(5) // cache for 5 minutes
    })

    if (!chainData) {
      res.status(500)
      return res.send('Error forming data', true)
    }
    return res.json(chainData);
  } catch (e) {
    sdk.log(e)
    res.status(500)
    return res.send('Internal Error', true)
  }
}

async function getProtocolTvl(req: HyperExpress.Request, res: HyperExpress.Response) {
  try {
    let name = sluggify({ name: req.path_parameters.name } as any)
    const protocolData = (cache as any)['protocolSlugMap'][name];
    res.setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Expires": getTimeInFutureMinutes(5)
    })

    // check if it is a parent protocol
    if (!protocolData) {
      const parentProtocol = cache['parentProtocolSlugMap'][name]
      if (parentProtocol) {
        const childProtocols = cache.childProtocols[parentProtocol.id] ?? []
        if (childProtocols.length < 1 || childProtocols.map((p: any) => p.name).includes(parentProtocol.name)) {
          res.status(404)
          return res.send("Protocol is not in our database", true)
        }

        const tvl = childProtocols.map(getLastHourlyRecord).reduce((acc: number, cur: any) => acc + cur.tvl, 0);
        return res.json(tvl);
      }
    }

    if (!protocolData) {
      res.status(404)
      return res.send('Not found', true)
    }
    const responseData = getLastHourlyRecord(protocolData);
    return res.json(responseData?.tvl);
  } catch (e) {
    sdk.log(e)
    res.status(500)
    return res.send('Internal Error', true)
  }
}

async function getTokenInProtocols(req: HyperExpress.Request, res: HyperExpress.Response) {
  try {
    let symbol = req.path_parameters.symbol
    if (!symbol) {
      res.status(404)
      return res.send('Ser you need to provide a token', true)
    }

    res.setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Expires": getTimeInFutureMinutes(10)
    })

    const responseData = await getTokensInProtocolsInternal(symbol, {
      protocolList: cache.metadata.protocols,
      protocolHasMisrepresentedTokens: protocolHasMisrepresentedTokens as any,
      getLastHourlyTokensUsd: getLastHourlyTokensUsd as any,
    });
    return res.json(responseData);
  } catch (e) {
    sdk.log(e)
    res.status(500)
    return res.send('Internal Error', true)
  }
}

async function getSmolConfig(req: HyperExpress.Request, res: HyperExpress.Response) {
  try {
    let name = sluggify({ name: req.path_parameters.protocol } as any)
    let protocolData = cache.protocolSlugMap[name];
    res.setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Expires": getTimeInFutureMinutes(5)
    })

    // check if it is a parent protocol
    if (!protocolData) 
      protocolData = cache['parentProtocolSlugMap'][name];
     
    if (!protocolData) {
      res.status(404)
      return res.send('Protocol is not in our database', true)
    }
    return res.json(protocolData);
  } catch (e) {
    sdk.log(e)
    res.status(500)
    return res.send('Internal Error', true)
  }
}

function getTimeInFutureMinutes(minutes: number) {
  const date = new Date();
  // add five minutes to the current time
  date.setMinutes(date.getMinutes() + minutes);
  return date.toUTCString()
}


type GetProtocolishOptions = {
  dataType: string,
  useHourlyData?: boolean,
  skipAggregatedTvl?: boolean,
  useNewChainNames?: boolean,
}

type GetAllProtocolishOptions = {
  dataType: string,
  useHourlyData?: boolean,
  includeTokenBreakdowns?: boolean,
  useNewChainNames?: boolean,
}