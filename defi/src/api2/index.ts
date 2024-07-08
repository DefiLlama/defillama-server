import * as HyperExpress from "hyper-express";
import { initCache } from "./cache/index";
import { initializeTVLCacheDB } from "./db";
import setTvlRoutes from "./routes";
import process from "process";
import fs from 'fs'

const webserver = new HyperExpress.Server()

const port = +(process.env.PORT ?? 5001)

if (!process.env.API2_SUBPATH) throw new Error('Missing API2_SUBPATH env var')

async function main() {
  console.time('Api Server init')
  webserver.use((_req, res, next) => {
    res.append('Access-Control-Allow-Origin', '*');
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    next();
  });

  await Promise.all([
    initializeTVLCacheDB({ isApi2Server: true }),
    initCache({ cacheType: 'api-server' }),
  ])

  const router = new HyperExpress.Router()
  const subPath = '/' + process.env.API2_SUBPATH
  webserver.use(subPath, router)

  setTvlRoutes(router, subPath)
  webserver.get('/hash', (_req, res) => res.send(process.env.CURRENT_COMMIT_HASH))

  webserver.listen(port)
    .then(() => {
      console.timeEnd('Api Server init')
      console.log('Webserver started on port ' + port)
      try {
        const currentCommitHash = fs.readFileSync(__dirname + '/../../.current_commit_hash', 'utf8')
        process.env.CURRENT_COMMIT_HASH = currentCommitHash
        console.log('current code hash: ', currentCommitHash)
        fs.writeFileSync(__dirname + '/../../.safe_commit_hash', currentCommitHash)
      } catch (e) { }
      process.send!('ready')
    })
    .catch((e) => console.log('Failed to start webserver on port ' + port, e))
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('Shutting down gracefully...');
  setTimeout(() => process.exit(0), 5000); // wait 5 seconds before forcing shutdown
  webserver.close(() => {
    console.log('Server has been shut down gracefully');
    process.exit(0);
  })
}

main()

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // process.exit(1);
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown', error);
  process.exit(1);
})