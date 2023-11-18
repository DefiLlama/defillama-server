import * as HyperExpress from "hyper-express";
import { initCache } from "./cache";
import { initializeTVLCacheDB } from "./db";
import setTvlRoutes from "./routes/tvl";

const webserver = new HyperExpress.Server()

const port = +(process.env.PORT ?? 5001)

setTvlRoutes(webserver)

async function main() {
  await initializeTVLCacheDB({ isApi2Server: true })
  await initCache()

  webserver.listen(port)
    .then(() => console.log('Webserver started on port ' + port))
    .catch(() => console.log('Failed to start webserver on port ' + port))
}

main()