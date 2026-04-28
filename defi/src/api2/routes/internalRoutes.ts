
import { readFromPGCache, deleteFromPGCache, } from "../cache/file-cache";
import * as HyperExpress from "hyper-express";
import { errorResponse, errorWrapper as ew, successResponse } from "./utils";
import { craftProtocolV2 } from "../utils/craftProtocolV2";
import { getLatestProtocolItems } from "../db";
import { hourlyTokensTvl, hourlyTvl, hourlyUsdTokensTvl } from "../../utils/getLastRecord";
import { Protocol } from "../../protocols/types";
import { protocolsById } from "../../protocols/data";
import * as sdk from '@defillama/sdk';
import { clearDimensionsCacheV2 } from "../utils/dimensionsUtils";


const INTERNAL_SECRET_KEY = process.env.LLAMA_INTERNAL_ROUTE_KEY ?? process.env.LLAMA_PRO_API2_SECRET_KEY ?? process.env.API2_SUBPATH

export function setInternalRoutes(router: HyperExpress.Router, routerBasePath: string) {

  // router.get('/_internal/all-protocol-data', getAllProtocolLatestData)


  router.get('/debug-pg/*', debugHandler)
  router.delete('/debug-pg/*', debugHandler)

  async function debugHandler(req: any, res: any) {
    const fullPath = req.path;
    const routerPath = fullPath.split('debug-pg')[1];
    try {

      if (process.env.API2_SKIP_SUBPATH === 'true')
        if (!req.headers['x-internal-secret'] || req.headers['x-internal-secret'] !== INTERNAL_SECRET_KEY) throw new Error('Unauthorized')

      switch (req.method) {
        case 'GET':
          return res.json(await readFromPGCache(routerPath))
        case 'DELETE':
          if (routerPath === '/clear-dimensions-cache') {
            await clearDimensionsCacheV2()
          } else
            await deleteFromPGCache(routerPath)
          return res.json({ success: true })
        default:
          throw new Error('Unsupported method')
      }
    } catch (e) {
      console.error(e);
      return errorResponse(res, 'Internal server error', { statusCode: 500 })
    }
  }

  // ==================== Dune Credit Dashboard Routes ====================

  /**
   * GET /_internal/dune-credits
   * Fetches current billing period credit usage from Dune API.
   * Query params: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD (optional)
   */
  router.get('/_internal/dune-credits', ew(async (req: HyperExpress.Request, res: HyperExpress.Response) => {
    try {
      const { getDuneCreditUsage } = await import('../../../dimension-adapters/helpers/dune');

      const startDate = req.query_parameters.start_date;
      const endDate = req.query_parameters.end_date;

      const usage = await getDuneCreditUsage(startDate, endDate);
      return successResponse(res, usage, 5); // cache for 5 minutes
    } catch (e: any) {
      console.error('Error fetching Dune credits:', e.message);
      return errorResponse(res, `Failed to fetch Dune credit usage: ${e.message}`, { statusCode: 500 });
    }
  }));

  /**
   * GET /_internal/dune-credits/run-report
   * Returns the in-memory credit tracking report for the current/last run.
   * Shows per-adapter breakdown, expensive queries, and totals.
   */
  router.get('/_internal/dune-credits/run-report', ew(async (_req: HyperExpress.Request, res: HyperExpress.Response) => {
    try {
      const { generateDuneCreditReport } = await import('../../../dimension-adapters/helpers/dune');
      const report = generateDuneCreditReport();
      return successResponse(res, report, 1); // cache for 1 minute
    } catch (e: any) {
      console.error('Error generating Dune credit report:', e.message);
      return errorResponse(res, `Failed to generate credit report: ${e.message}`, { statusCode: 500 });
    }
  }));

  /**
   * DELETE /_internal/dune-credits/reset
   * Resets the in-memory credit tracker. Useful between runs.
   */
  router.delete('/_internal/dune-credits/reset', ew(async (_req: HyperExpress.Request, res: HyperExpress.Response) => {
    try {
      const { resetDuneCreditTracker } = await import('../../../dimension-adapters/helpers/dune');
      resetDuneCreditTracker();
      return successResponse(res, { success: true, message: 'Credit tracker reset' }, 0);
    } catch (e: any) {
      return errorResponse(res, `Failed to reset credit tracker: ${e.message}`, { statusCode: 500 });
    }
  }));

  // ==================== End Dune Credit Dashboard Routes ====================

}

async function getAllProtocolLatestData(_req: HyperExpress.Request, res: HyperExpress.Response) {
  res.setHeaders({
    "Expires": new Date(Date.now() + 5 * 60 * 1000).toUTCString()  // 5 minutes
  })
  let startTime = Date.now()

  const allProtocolItems = await getLatestProtocolItems(hourlyTvl, { filterLast24Hours: true })
  const allProtocolUSDItems = await getLatestProtocolItems(hourlyUsdTokensTvl, { filterLast24Hours: true })
  const allProtocolTokenItems = await getLatestProtocolItems(hourlyTokensTvl, { filterLast24Hours: true })
  const allProtocolItemsMap = {} as any
  const allProtocolUSDItemsMap = {} as any
  const allProtocolTokenItemsMap = {} as any
  const protocolIdArray = [] as any

  allProtocolItems.forEach((item: any) => {
    protocolIdArray.push(item.id)
    allProtocolItemsMap[item.id] = [item.data]
  })

  allProtocolUSDItems.forEach((item: any) => {
    allProtocolUSDItemsMap[item.id] = [item.data]
  })

  allProtocolTokenItems.forEach((item: any) => {
    allProtocolTokenItemsMap[item.id] = [item.data]
  })

  function getCachedProtocolData(protocol: Protocol) {
    const protocolId = protocol.id
    const protocolData = allProtocolItemsMap[protocolId] ?? []
    const protocolUSDData = allProtocolUSDItemsMap[protocolId] ?? []
    const protocolTokenData = allProtocolTokenItemsMap[protocolId] ?? []
    return [protocolData, protocolUSDData, protocolTokenData]
  }

  const responseData = [] as any
  for (const protocolId of protocolIdArray) {
    try {
      const protocolData = protocolsById[protocolId]
      if (!protocolData) {
        continue
      }
      const protocolResponse = await craftProtocolV2({
        protocolData,
        useNewChainNames: true,
        skipAggregatedTvl: false,
        skipCachedHourlyData: true,
        getCachedProtocolData,
      })
      responseData.push(protocolResponse)
    } catch (e) {
      console.error('Error processing protocol', protocolId, e)
    }
  }

  const endTime = Date.now()
  const elapsedTime = endTime - startTime
  sdk.log('Elapsed time:', elapsedTime / 1000, 's')

  return res.json(responseData);
}