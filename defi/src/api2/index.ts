import './utils/failOnError'
import * as HyperExpress from "hyper-express";
import { initCache } from "./cache/index";
import { initializeTVLCacheDB } from "./db";
import setTvlRoutes from "./routes";
import process from "process";
import fs from 'fs'
import { RUN_TYPE } from "./utils";
import { setInternalRoutes } from './routes/internalRoutes';

const webserver = new HyperExpress.Server()

const port = +(process.env.PORT ?? 5001)
const skipSubPath = process.env.API2_SKIP_SUBPATH === 'true'

if (!skipSubPath && !process.env.API2_SUBPATH) throw new Error('Missing API2_SUBPATH env var')

async function main() {
  console.time('Api Server init')
  webserver.use((_req, res, next) => {
    res.append('Access-Control-Allow-Origin', '*');
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.append('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Internal-Key');
    next();
  });

  await Promise.all([
    initializeTVLCacheDB({ isApi2Server: true }),
    initCache({ cacheType: RUN_TYPE.API_SERVER }),
  ])

  if (skipSubPath) {
    setTvlRoutes(webserver, '/')
  }

  if (process.env.API2_SUBPATH) {
    const router = new HyperExpress.Router()
    const subPath = '/' + process.env.API2_SUBPATH
    webserver.use(subPath, router)

    setTvlRoutes(router, subPath)
  }

  if (process.env.API2_SUBPATH) {
    const router = new HyperExpress.Router()
    const subPath = '/' + process.env.API2_SUBPATH + '_internal'
    webserver.use(subPath, router)
    setInternalRoutes(router, subPath)
  }

  webserver.get('/hash', (_req, res) => res.send(process.env.CURRENT_COMMIT_HASH))

  webserver.options('/*', (req, res) => {
    const origin = req.headers.origin;

    const isFromDefiLlama = origin === 'https://defillama.com'
    
    if (req.headers.authorization && !isFromDefiLlama) {
      res.status(403).send();
    } else {
      res.status(200).send();
    }
  });

  webserver.listen(port)
    .then(() => {
      console.timeEnd('Api Server init')
      console.log('Webserver started on port ' + port)
      try {
        const currentCommitHash = fs.readFileSync(__dirname + '/../../.current_commit_hash', 'utf8')
        process.env.CURRENT_COMMIT_HASH = currentCommitHash
        console.log('current code hash: ', currentCommitHash)
        fs.writeFileSync(__dirname + '/../../.safe_commit_hash', currentCommitHash)
      } catch (e) { console.error('Failed to read current commit hash', (e as any).message) }
      try {
        process.send!('ready')
      } catch (e) { console.error('Failed to send ready message to parent process') }
    })
    .catch((e) => console.log('Failed to start webserver on port ' + port, e.message))
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
