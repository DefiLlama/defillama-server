
import { readFromPGCache, deleteFromPGCache, } from "../cache/file-cache";
import * as HyperExpress from "hyper-express";
import { errorResponse } from "./utils";
import { craftProtocolV2 } from "../utils/craftProtocolV2";
import { getLatestProtocolItems } from "../db";
import { hourlyTokensTvl, hourlyTvl, hourlyUsdTokensTvl } from "../../utils/getLastRecord";
import { Protocol } from "../../protocols/types";
import { protocolsById } from "../../protocols/data";
import * as sdk from '@defillama/sdk';


export function setInternalRoutes(router: HyperExpress.Router, routerBasePath: string) {

  router.get('/_internal/all-protocol-data', getAllProtocolLatestData)


  router.get('/debug-pg/*', debugHandler)
  router.delete('/debug-pg/*', debugHandler)

  async function debugHandler(req: any, res: any) {
    const fullPath = req.path;
    const routerPath = fullPath.replace(routerBasePath + '/debug-pg', '');
    sdk.log('debug-pg', routerPath)
    try {

      switch (req.method) {
        case 'GET':
          return res.json(await readFromPGCache(routerPath))
        case 'DELETE':
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
        useHourlyData: false,
        skipAggregatedTvl: false,
        getCachedProtocolData,
      })
      responseData.push(protocolResponse)
    } catch (e) {
      console.error('Error processing protocol', protocolId, e)
    }
  }

  const endTime = Date.now()
  const elapsedTime = endTime - startTime
  sdk.log('Elapsed time:', elapsedTime/1000, 's')

  return res.json(responseData);
}