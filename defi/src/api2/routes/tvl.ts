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
import { successResponse, errorWrapper as ew } from "./utils";
import { getContractNameInternal } from "../../getContractName";
import { getRaisesInternal } from "../../getRaises";
import { getHacksInternal } from "../../getHacks";
import { readFromPGCache } from "../db";
import { PG_CACHE_KEYS } from "../constants";
import { getSimpleChainDatasetInternal } from "../../getSimpleChainDataset";
import { getTotalChainDatasetInternal } from "../../getTotalChainDataset";
import craftCsvDataset from "../../storeTvlUtils/craftCsvDataset";

export default function setRoutes(webserver: HyperExpress.Server) {

  webserver.get("/protocol/:name", ew(async (req: any, res: any) => getProtocolishData(req, res, { dataType: 'protocol', skipAggregatedTvl: false, useNewChainNames: false, })));
  webserver.get("/treasury/:name", ew(async (req: any, res: any) => getProtocolishData(req, res, { dataType: 'treasury' })));
  webserver.get("/entity/:name", ew(async (req: any, res: any) => getProtocolishData(req, res, { dataType: 'entities' })));
  webserver.get("/updatedProtocol/:name", (async (req, res) => getProtocolishData(req, res, { dataType: 'protocol', useHourlyData: false, skipAggregatedTvl: req.query_parameters.includeAggregatedTvl !== 'true' })));
  webserver.get("/hourly/:name", (async (req, res) => getProtocolishData(req, res, { dataType: 'protocol', useHourlyData: true, skipAggregatedTvl: false })));

  webserver.get("/protocols", ew(async (req: any, res: any) => getAllProtocolishData(req, res, { dataType: 'protocol', includeTokenBreakdowns: false, useNewChainNames: false, })));
  webserver.get("/treasuries", ew(async (req: any, res: any) => getAllProtocolishData(req, res, { dataType: 'treasury' })));
  webserver.get("/entities", ew(async (req: any, res: any) => getAllProtocolishData(req, res, { dataType: 'entities' })));

  webserver.get('/chains', ew(async (req: any, res: any) => getChainsData(req, res, { isV2: false })))
  webserver.get('/v2/chains', ew(async (req: any, res: any) => getChainsData(req, res, { isV2: true })))

  webserver.get("/tvl/:name", ew(getProtocolTvl));
  webserver.get("/tokenProtocols/:symbol", ew(getTokenInProtocols));
  webserver.get("/config/smol/:protocol", ew(getSmolConfig));
  webserver.get("/config/:chain/:contract", ew(getContractName));

  webserver.get("/raises", ew(getRaises)); // todo: add env AIRTABLE_API_KEY
  webserver.get("/hacks", ew(getHacks));
  webserver.get("/oracles", ew(getOracles)); // todo: map to r2 endpoint?
  webserver.get("/forks", ew(getForks)); // todo: map to r2 endpoint?
  webserver.get("/categories", ew(getCategories)); // todo: map to r2 endpoint?

  webserver.get("/simpleChainDataset/:chain", ew(getSimpleChainDataset));
  webserver.get("/totalChainDataset/:chain", ew(getTotalChainDataset));
  webserver.get("/dataset/:protocol", ew(getDataset));

  webserver.get("/config", ew(getConfig));
}


async function getProtocolishData(req: HyperExpress.Request, res: HyperExpress.Response, { dataType, useHourlyData = false, skipAggregatedTvl = true, useNewChainNames = true }: GetProtocolishOptions) {
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
}

// todo add code to read query parameter and include chain data if requested
async function getAllProtocolishData(req: HyperExpress.Request, res: HyperExpress.Response, { dataType, useNewChainNames = true, includeTokenBreakdowns = true, }: GetAllProtocolishOptions) {
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


  if (!data) {
    res.status(500)
    return res.send('Error forming data', true)
  }
  return successResponse(res, data, 5);
}

async function getChainsData(_req: HyperExpress.Request, res: HyperExpress.Response, { isV2 = false }: { isV2?: boolean }) {
  const protocolList: IProtocol[] = cache.metadata.protocols
  const chainData: IChain[] = await craftChainsResponse(isV2, isV2, {
    protocolList,
    getLastHourlyRecord: getLastHourlyRecord as any,
    checkModuleDoubleCounted: checkModuleDoubleCounted as any,
  })

  if (!chainData) {
    res.status(500)
    return res.send('Error forming data', true)
  }
  return successResponse(res, chainData, 5);
}

async function getProtocolTvl(req: HyperExpress.Request, res: HyperExpress.Response) {
  let name = sluggify({ name: req.path_parameters.name } as any)
  const protocolData = (cache as any)['protocolSlugMap'][name];

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
  return successResponse(res, responseData?.tvl, 5);

}

async function getTokenInProtocols(req: HyperExpress.Request, res: HyperExpress.Response) {
  let symbol = req.path_parameters.symbol
  if (!symbol) {
    res.status(404)
    return res.send('Ser you need to provide a token', true)
  }

  const responseData = await getTokensInProtocolsInternal(symbol, {
    protocolList: cache.metadata.protocols,
    protocolHasMisrepresentedTokens: protocolHasMisrepresentedTokens as any,
    getLastHourlyTokensUsd: getLastHourlyTokensUsd as any,
  });

  return successResponse(res, responseData, 10);
}

async function getSmolConfig(req: HyperExpress.Request, res: HyperExpress.Response) {
  let name = sluggify({ name: req.path_parameters.protocol } as any)
  let protocolData = cache.protocolSlugMap[name];

  // check if it is a parent protocol
  if (!protocolData)
    protocolData = cache['parentProtocolSlugMap'][name];

  if (!protocolData) {
    res.status(404)
    return res.send('Protocol is not in our database', true)
  }
  return successResponse(res, protocolData, 5);
}

async function getContractName(req: HyperExpress.Request, res: HyperExpress.Response) {
  let chain = req.path_parameters.chain
  let contract = req.path_parameters.contract
  if (!chain || !contract) {
    res.status(404)
    return res.send('Ser you need to provide a chain and contract', true)
  }
  const name = await getContractNameInternal(chain, contract);
  return successResponse(res, { name }, 3 * 60); // 3h
}

async function getRaises(_req: HyperExpress.Request, res: HyperExpress.Response) {
  return successResponse(res, await getRaisesInternal(), 30)
}

async function getHacks(_req: HyperExpress.Request, res: HyperExpress.Response) {
  return successResponse(res, await getHacksInternal(), 30)
}

async function getOracles(_req: HyperExpress.Request, res: HyperExpress.Response) {
  return successResponse(res, await readFromPGCache(PG_CACHE_KEYS.ORACLES_DATA), 10)
}

async function getForks(_req: HyperExpress.Request, res: HyperExpress.Response) {
  return successResponse(res, await readFromPGCache(PG_CACHE_KEYS.FORKS_DATA), 10)
}

async function getCategories(_req: HyperExpress.Request, res: HyperExpress.Response) {
  return successResponse(res, await readFromPGCache(PG_CACHE_KEYS.CATEGORIES_DATA), 10)
}

async function getSimpleChainDataset(req: HyperExpress.Request, res: HyperExpress.Response) {
  const chain = req.path_parameters.chain
  const params = req.query_parameters
  const { error, filename, csv } = await getSimpleChainDatasetInternal(chain, params)
  if (error) {
    res.status(400)
    return res.send(error, true)
  }

  res.type('text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)

  return successResponse(res, csv, 10)
}

async function getTotalChainDataset(req: HyperExpress.Request, res: HyperExpress.Response) {
  const chain = req.path_parameters.chain
  const params = req.query_parameters
  const { error, csv } = await getTotalChainDatasetInternal(chain, params)
  if (error) {
    res.status(400)
    return res.send(error, true)
  }

  res.type('text/csv')

  return successResponse(res, csv, 10)
}

async function getDataset(req: HyperExpress.Request, res: HyperExpress.Response) {
  const protocolName = req.path_parameters.protocol?.toLowerCase()
  const filename = `${protocolName}.csv`;
  const name = sluggify({ name: protocolName } as any)
  const protocolData = cache.protocolSlugMap[name];
  if (!protocolData) {
    res.status(404)
    return res.send('Not found', true)
  }

  const csv = await craftCsvDataset([protocolData], true, false, { readFromPG: true });

  res.type('text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)

  return successResponse(res, csv, 30)
}

async function getConfig(_req: HyperExpress.Request, res: HyperExpress.Response) {
  const data = {
    protocols: cache.metadata.protocols,
    chainCoingeckoIds: cache.metadata.chainCoingeckoIds,
  }
  return successResponse(res, data, 5)
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