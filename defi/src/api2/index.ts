import * as HyperExpress from "hyper-express";
import { cache, initCache } from "./cache";
import sluggify from "../utils/sluggify";
import craftProtocolV2 from "./utils/craftProtocolV2";
import craftParentProtocolV2 from "./utils/craftParentProtocolV2";
const webserver = new HyperExpress.Server()

const port = +(process.env.PORT ?? 80)

async function getProtocolishData(req: HyperExpress.Request, res: HyperExpress.Response, dataType: string) {
  try {
    let name = sluggify({ name: req.path_parameters.name } as any)
    const protocolData = (cache as any)[dataType + 'SlugMap'][name];

    // check if it is a parent protocol
    if (!protocolData && dataType === 'protocol') {
      const parentProtocol = (cache as any)['parentProtocolSlugMap'][name];
      if (parentProtocol) {
        const responseData = await craftParentProtocolV2({
          parentProtocol: parentProtocol,
          useHourlyData: false,
          skipAggregatedTvl: false,
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
      useNewChainNames: true,
      useHourlyData: false,
      skipAggregatedTvl: dataType !== 'protocol',
    });
    return res.json(responseData);
  } catch (e) {
    res.status(500)
    return res.send('Internal Error', true)
  }
}

webserver.get("/protocol/:name", async (req, res) => getProtocolishData(req, res, 'protocol'));
webserver.get("/treasury/:name", async (req, res) => getProtocolishData(req, res, 'treasury'));
webserver.get("/entity/:name", async (req, res) => getProtocolishData(req, res, 'entities'));

async function main() {
  await initCache()

  webserver.listen(port)
    .then(() => console.log('Webserver started on port ' + port))
    .catch(() => console.log('Failed to start webserver on port ' + port))
}

main()