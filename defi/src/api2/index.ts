import * as HyperExpress from "hyper-express";
import { cache, initCache } from "./cache";
import sluggify from "../utils/sluggify";
import craftProtocolV2 from "./utils/craftProtocolV2";
import craftParentProtocolV2 from "./utils/craftParentProtocolV2";
import { initializeTVLCacheDB } from "./db";
import * as sdk from '@defillama/sdk'

const webserver = new HyperExpress.Server()

const port = +(process.env.PORT ?? 5001)

type GetProtocolishOptions = {
  dataType: string,
  useHourlyData?: boolean,
  skipAggregatedTvl?: boolean,
  useNewChainNames?: boolean,
}

async function getProtocolishData(req: HyperExpress.Request, res: HyperExpress.Response, { dataType, useHourlyData = false, skipAggregatedTvl = true, useNewChainNames = true }: GetProtocolishOptions) {
  try {
    let name = sluggify({ name: req.path_parameters.name } as any)
    const protocolData = (cache as any)[dataType + 'SlugMap'][name];

    // check if it is a parent protocol
    if (!protocolData && dataType === 'protocol') {
      const parentProtocol = (cache as any)['parentProtocolSlugMap'][name];
      if (parentProtocol) {
        const responseData = await craftParentProtocolV2({
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
    const responseData = await craftProtocolV2({
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

webserver.get("/protocol/:name", async (req, res) => getProtocolishData(req, res, { dataType: 'protocol', skipAggregatedTvl: false, useNewChainNames: false, }));
webserver.get("/treasury/:name", async (req, res) => getProtocolishData(req, res, { dataType: 'treasury' }));
webserver.get("/entity/:name", async (req, res) => getProtocolishData(req, res, { dataType: 'entities' }));
webserver.get("/updatedProtocol/:name", async (req, res) => getProtocolishData(req, res, { dataType: 'protocol', useHourlyData: true, skipAggregatedTvl: req.query_parameters.includeAggregatedTvl !== 'true' }));
webserver.get("/hourly/:name", async (req, res) => getProtocolishData(req, res, { dataType: 'protocol', useHourlyData: true, skipAggregatedTvl: false }));

async function main() {
  await initializeTVLCacheDB()
  await initCache()

  webserver.listen(port)
    .then(() => console.log('Webserver started on port ' + port))
    .catch(() => console.log('Failed to start webserver on port ' + port))
}

main()