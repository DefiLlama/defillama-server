import * as HyperExpress from "hyper-express";
import { initCache } from "./cache/index";
import { initializeTVLCacheDB } from "./db";
import setTvlRoutes from "./routes";
import process from "process";

const webserver = new HyperExpress.Server()

const port = +(process.env.PORT ?? 5001)

if (!process.env.API2_SUBPATH) throw new Error('Missing API2_SUBPATH env var')

async function main() {
  console.time('Api Server init')

  await Promise.all([
    initializeTVLCacheDB({ isApi2Server: true }),
    initCache({ cacheType: 'api-server' }),
  ])

  const router = new HyperExpress.Router()
  const subPath = '/' + process.env.API2_SUBPATH
  webserver.use(subPath, router)

  setTvlRoutes(router, subPath)

  webserver.listen(port)
    .then(() => {
      console.timeEnd('Api Server init')
      console.log('Webserver started on port ' + port)
      process.send!('ready')
    })
    .catch(() => console.log('Failed to start webserver on port ' + port))
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('Shutting down gracefully...');
  webserver.close(() => {
    console.log('Server has been shut down gracefully');
    process.exit(0);
  })
}

main()