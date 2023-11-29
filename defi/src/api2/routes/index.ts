import * as HyperExpress from "hyper-express";
import { cache, getLastHourlyTokensUsd, protocolHasMisrepresentedTokens, } from "../cache";
import { readRouteData, readFromPGCache, deleteFromPGCache, } from "../cache/file-cache";
import sluggify from "../../utils/sluggify";
import { cachedCraftProtocolV2 } from "../utils/craftProtocolV2";
import { cachedCraftParentProtocolV2 } from "../utils/craftParentProtocolV2";
import * as sdk from '@defillama/sdk'
import { get20MinDate } from "../../utils/shared";
import { getTokensInProtocolsInternal } from "../../getTokenInProtocols";
import { successResponse, errorWrapper as ew } from "./utils";
import { getSimpleChainDatasetInternal } from "../../getSimpleChainDataset";
import craftCsvDataset from "../../storeTvlUtils/craftCsvDataset";

export default function setRoutes(router: HyperExpress.Router, routerBasePath: string) {
  // router.get("/hourly/:name", (async (req, res) => getProtocolishData(req, res, { dataType: 'protocol', useHourlyData: true, skipAggregatedTvl: false })));  // too expensive to handle here
  // router.get("/config/:chain/:contract", ew(getContractName));  // too many requests to handle here
  // add secret route to delete from PG cache

  router.get("/protocol/:name", ew(async (req: any, res: any) => getProtocolishData(req, res, { dataType: 'protocol', skipAggregatedTvl: false, useNewChainNames: false, })));
  router.get("/treasury/:name", ew(async (req: any, res: any) => getProtocolishData(req, res, { dataType: 'treasury' })));
  router.get("/entity/:name", ew(async (req: any, res: any) => getProtocolishData(req, res, { dataType: 'entities' })));
  router.get("/updatedProtocol/:name", (async (req, res) => getProtocolishData(req, res, { dataType: 'protocol', useHourlyData: false, skipAggregatedTvl: req.query_parameters.includeAggregatedTvl !== 'true' })));

  router.get("/tokenProtocols/:symbol", ew(getTokenInProtocols));
  router.get("/protocols", protocolsRouteResponse);
  router.get("/config", configRouteResponse);
  router.get("/lite/charts", liteChartsRouteResponse); // TODO: find where old lang endpoint is used and update it

  router.get("/treasuries", defaultFileHandler);
  router.get("/entities", defaultFileHandler);
  router.get('/chains', defaultFileHandler)
  router.get('/v2/chains', defaultFileHandler)
  router.get("/tvl/:name", defaultFileHandler);
  router.get("/config/smol/:protocol", defaultFileHandler);
  router.get("/raises", defaultFileHandler); // todo: add env AIRTABLE_API_KEY
  router.get("/hacks", defaultFileHandler);
  router.get("/oracles", defaultFileHandler);
  router.get("/forks", defaultFileHandler);
  router.get("/categories", defaultFileHandler);
  router.get("/langs", defaultFileHandler); // TODO: find where old lang endpoint is used and update it
  router.get("/lite/charts/:chain", defaultFileHandler); // TODO: find where old lang endpoint is used and update it

  router.get("/simpleChainDataset/:chain", ew(getSimpleChainDataset));
  router.get("/dataset/:protocol", ew(getDataset));

  router.delete("/debug-pg/:filename", deletePGCache)
  router.get("/debug-pg/:filename", readPGCache)


  function defaultFileHandler(req: HyperExpress.Request, res: HyperExpress.Response) {
    const fullPath = req.path;
    const routerPath = fullPath.replace(routerBasePath, '');
    return fileResponse(routerPath, res);
  }

  function configRouteResponse(_req: HyperExpress.Request, res: HyperExpress.Response) {
    return fileResponse('configs', res);
  }

  function liteChartsRouteResponse(_req: HyperExpress.Request, res: HyperExpress.Response) {
    return fileResponse('lite/charts-total', res);
  }

  function protocolsRouteResponse(req: HyperExpress.Request, res: HyperExpress.Response) {
    if (req.query_parameters.includeChains === 'true')
      return fileResponse('protocols-with-chains', res);
    return fileResponse('protocols', res);
  }

  async function fileResponse(filePath: string, res: HyperExpress.Response) {
    try {
      res.set('Cache-Control', 'public, max-age=600'); // Set caching to 10 minutes
      res.json(await readRouteData(filePath))
    } catch (e) {
      console.error(e);
      res.status(500)
      return res.send('Internal server error', true)
    }
  }

  async function readPGCache(req: HyperExpress.Request, res: HyperExpress.Response) {
    try {
      const fullPath = req.path;
      const routerPath = fullPath.replace(routerBasePath + '/debug-pg', '');
      console.log('readPGCache', routerPath)
      res.json(await readFromPGCache(routerPath))
    } catch (e) {
      console.error(e);
      res.status(500)
      return res.send('Internal server error', true)
    }
  }

  async function deletePGCache(req: HyperExpress.Request, res: HyperExpress.Response) {
    try {
      const fullPath = req.path;
      const routerPath = fullPath.replace(routerBasePath + '/debug-pg', '');
      console.log('deletePGCache', routerPath)
      await deleteFromPGCache(routerPath)
      res.json({ success: true })
    } catch (e) {
      console.error(e);
      res.status(500)
      return res.send('Internal server error', true)
    }
  }
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

async function getSimpleChainDataset(req: HyperExpress.Request, res: HyperExpress.Response) {
  const chain = req.path_parameters.chain
  const params = req.query_parameters
  const options = {
    ...params,
    getHistTvlMeta: () => cache.historicalTvlForAllProtocolsMeta,
    readFromPG: true,
  }
  const { error, filename, csv } = await getSimpleChainDatasetInternal(chain, options)
  if (error) {
    res.status(400)
    return res.send(error, true)
  }

  res.type('text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)

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

type GetProtocolishOptions = {
  dataType: string,
  useHourlyData?: boolean,
  skipAggregatedTvl?: boolean,
  useNewChainNames?: boolean,
}
