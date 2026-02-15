import * as HyperExpress from 'hyper-express';
import { readRouteData, getCacheVersion, readPGCacheForId } from './file-cache';
import { rwaSlug } from './utils';

const webserver = new HyperExpress.Server();
const port = +(process.env.RWA_PORT ?? 5002);
const RWA_SUBPATH = process.env.RWA_SUBPATH;

if (!RWA_SUBPATH) {
    throw new Error('Missing required environment variable: RWA_SUBPATH');
}

function getTimeInFutureMinutes(minutes: number): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    return date.toUTCString();
}

function successResponse(
    res: HyperExpress.Response,
    data: any,
    cacheMinutes: number = 30
): void {
    res.setHeaders({
        Expires: getTimeInFutureMinutes(cacheMinutes),
    });
    res.json(data);
}

function errorResponse(
    res: HyperExpress.Response,
    message: string = 'Internal server error',
    statusCode: number = 400
): void {
    res.status(statusCode);
    res.send(message, true);
}

async function fileResponse(
    filePath: string,
    res: HyperExpress.Response,
    cacheMinutes: number = 10
): Promise<void> {
    try {
        res.set('Cache-Control', `public, max-age=${cacheMinutes * 60}`);
        const data = await readRouteData(filePath, { readAsArrayBuffer: true });
        if (!data) {
            return errorResponse(res, 'Not found', 404);
        }
        res.set('Content-Type', 'application/json');
        res.send(data);
    } catch (e) {
        console.error('Error serving file:', e);
        return errorResponse(res, 'Internal server error', 500);
    }
}

function errorWrapper(routeFn: (req: HyperExpress.Request, res: HyperExpress.Response) => Promise<void>) {
    return async (req: HyperExpress.Request, res: HyperExpress.Response) => {
        try {
            await routeFn(req, res);
        } catch (e) {
            console.error('Route error:', e);
            res.status(500);
            return res.send('Internal Error', true);
        }
    };
}

function setRoutes(router: HyperExpress.Router): void {
    // Get current RWA data (list of all RWAs with current values)
    router.get(
        '/current',
        errorWrapper(async (_req, res) => {
            return fileResponse('current.json', res, 20);
        })
    );

    // Get RWA list (lightweight list of all RWAs)
    router.get(
        '/list',
        errorWrapper(async (_req, res) => {
            return fileResponse('list.json', res, 30);
        })
    );

    // Get aggregate stats
    router.get(
        '/stats',
        errorWrapper(async (_req, res) => {
            return fileResponse('stats.json', res, 20);
        })
    );

    // Get ID map (name -> id mapping)
    router.get(
        '/id-map',
        errorWrapper(async (_req, res) => {
            return fileResponse('id-map.json', res, 60);
        })
    );
  
    router.get('/chart/chain-breakdown', handleGetChartBreakdown('chain-breakdown'));
    router.get('/chart/category-breakdown', handleGetChartBreakdown('category-breakdown'));
    router.get('/chart/platform-breakdown', handleGetChartBreakdown('platform-breakdown'));

    // Get historical chart data for a specific RWA by ID
    router.get(
        '/chart/:id',
        errorWrapper(async (req, res) => {
            const { id } = req.params;
            if (!id) {
                return errorResponse(res, 'Missing id parameter', 400);
            }
            return fileResponse(`charts/${id}.json`, res, 30);
        })
    );

    // Get historical chart data for a specific RWA by name
    router.get(
        '/chart/name/:name',
        errorWrapper(async (req, res) => {
            const { name } = req.params;
            if (!name) {
                return errorResponse(res, 'Missing name parameter', 400);
            }

            // Read ID map to find the ID for this name
            const idMap = await readRouteData('id-map.json');
            if (!idMap) {
                return errorResponse(res, 'ID map not found', 500);
            }

            const id = idMap[name];
            if (!id) {
                return errorResponse(res, `RWA "${name}" not found`, 404);
            }

            return fileResponse(`charts/${id}.json`, res, 30);
        })
    );

    // Get historical chart data by chain (accepts label, converts to key)
    router.get(
        '/chart/chain/:chain',
        errorWrapper(async (req, res) => {
            const { chain } = req.params;
            if (!chain) {
                return errorResponse(res, 'Missing chain parameter', 400);
            }
            const key = rwaSlug(chain);
            return fileResponse(`charts/chain/${key}.json`, res, 30);
        })
    );

    // Get historical chart data by chain (accepts label, converts to key)
    router.get(
        '/chart/chain/:chain/ticker-breakdown',
        errorWrapper(async (req, res) => {
            const { chain } = req.params;
            if (!chain) {
                return errorResponse(res, 'Missing chain parameter', 400);
            }
            const key = rwaSlug(chain);
            return fileResponse(`charts/chain-ticker-breakdown/${key}.json`, res, 30);
        })
    );

    // Get historical chart data for asset by ID (from pg-cache)
    router.get(
        '/chart/asset/:id',
        errorWrapper(async (req, res) => {
            const { id } = req.params;
            if (!id) {
                return errorResponse(res, 'Missing id parameter', 400);
            }
            const pgCache = await readPGCacheForId(id);
            if (!pgCache) {
                return errorResponse(res, `Asset "${id}" not found`, 404);
            }
            // Convert pg-cache map to sorted array
            const data = Object.entries(pgCache)
                .map(([timestamp, record]) => ({ timestamp: Number(timestamp), ...record }))
                .sort((a, b) => a.timestamp - b.timestamp);
            return successResponse(res, data, 30);
        })
    );

    // Get historical chart data by category
    router.get(
        '/chart/category/:category',
        errorWrapper(async (req, res) => {
            const { category } = req.params;
            if (!category) {
                return errorResponse(res, 'Missing category parameter', 400);
            }
            const key = rwaSlug(category);
            return fileResponse(`charts/category/${key}.json`, res, 30);
        })
    );

    // Get historical chart data by category - breakdown by tickers
    router.get(
        '/chart/category/:category/ticker-breakdown',
        errorWrapper(async (req, res) => {
            const { category } = req.params;
            if (!category) {
                return errorResponse(res, 'Missing category parameter', 400);
            }
            const key = rwaSlug(category);
            return fileResponse(`charts/category-ticker-breakdown/${key}.json`, res, 30);
        })
    );

    // Get historical chart data by platform
    router.get(
        '/chart/platform/:platform',
        errorWrapper(async (req, res) => {
            const { platform } = req.params;
            if (!platform) {
                return errorResponse(res, 'Missing platform parameter', 400);
            }
            const key = rwaSlug(platform);
            return fileResponse(`charts/platform/${key}.json`, res, 30);
        })
    );
  
    // Get historical chart data by platform - breakdown by tickers
    router.get(
        '/chart/platform/:platform/ticker-breakdown',
        errorWrapper(async (req, res) => {
            const { platform } = req.params;
            if (!platform) {
                return errorResponse(res, 'Missing platform parameter', 400);
            }
            const key = rwaSlug(platform);
            return fileResponse(`charts/platform-ticker-breakdown/${key}.json`, res, 30);
        })
    );

    // Get specific RWA data by ID from current data
    router.get(
        '/rwa/:id',
        errorWrapper(async (req, res) => {
            const { id } = req.params;
            if (!id) {
                return errorResponse(res, 'Missing id parameter', 400);
            }

            const currentData = await readRouteData('current.json');
            if (!currentData) {
                return errorResponse(res, 'Data not found', 500);
            }

            const idParam = String(id).toLowerCase();

            const rwa = currentData.find((item: any) => {
                const itemId = item?.id;
                return typeof itemId !== 'undefined' && String(itemId).toLowerCase() === idParam;
            });

            if (!rwa) {
                return errorResponse(res, `RWA "${id}" not found`, 404);
            }

            return successResponse(res, rwa, 20);
        })
    );

    // Get specific RWA data by ID from current data
    router.get(
        '/asset/:ticker',
        errorWrapper(async (req, res) => {
            const { ticker } = req.params;
            if (!ticker) {
                return errorResponse(res, 'Missing ticker parameter', 400);
            }

            const currentData = await readRouteData('current.json');
            if (!currentData) {
                return errorResponse(res, 'Data not found', 500);
            }

            const tickerParam = rwaSlug(ticker);

            const rwa = currentData.find((item: any) => {
                const itemTicker = item?.ticker;
                return typeof itemTicker !== 'undefined' && rwaSlug(itemTicker) === tickerParam;
            });

            if (!rwa) {
                return errorResponse(res, `Asset "${ticker}" not found`, 404);
            }

            return successResponse(res, rwa, 20);
        })
    );

    // Get RWAs by category
    router.get(
        '/category/:category',
        errorWrapper(async (req, res) => {
            const { category } = req.params;
            if (!category) {
                return errorResponse(res, 'Missing category parameter', 400);
            }

            const currentData = await readRouteData('current.json');
            if (!currentData) {
                return errorResponse(res, 'Data not found', 500);
            }

            const categoryLower = category.toLowerCase();
            const filtered = currentData.filter((item: any) => {
                const categories = item.category || [];
                return categories.some((cat: string) => cat.toLowerCase() === categoryLower);
            });

            return successResponse(res, { data: filtered, timestamp: currentData.timestamp }, 20);
        })
    );

    // Get RWAs by chain
    router.get(
        '/chain/:chain',
        errorWrapper(async (req, res) => {
            const { chain } = req.params;
            if (!chain) {
                return errorResponse(res, 'Missing chain parameter', 400);
            }

            const currentData = await readRouteData('current.json');
            if (!currentData) {
                return errorResponse(res, 'Data not found', 500);
            }

            const chainLower = chain.toLowerCase();
            const filtered = currentData.filter((item: any) => {
                // Check if chain exists in onChainMcap/activeMcap/defiActiveTvl.
                const chains = [
                    ...Object.keys(item.onChainMcap || {}),
                    ...Object.keys(item.activeMcap || {}),
                    ...Object.keys(item.defiActiveTvl || {}),
                ];
                return chains.some((c) => c.toLowerCase() === chainLower);
            });

            return successResponse(res, { data: filtered, timestamp: currentData.timestamp }, 20);
        })
    );
  
    function handleGetChartBreakdown(breakdown: 'chain-breakdown' | 'category-breakdown' | 'platform-breakdown') {
        return errorWrapper(async (req, res) => {
            const { key, includeStablecoin, includeGovernance } = req.query;
            
            const queryKey = (key && ['onChainMcap', 'activeMcap', 'defiActiveTvl'].includes(String(key))) ? key : 'onChainMcap';
            const queryIncludeStablecoin = includeStablecoin && String(includeStablecoin) === 'true';
            const queryIncludeGovernance = includeGovernance && String(includeGovernance) === 'true';
          
            let filePath = `charts/${breakdown}`;
            if (!queryIncludeStablecoin && !queryIncludeGovernance) {
              filePath += '/base';
            } else if (queryIncludeStablecoin && queryIncludeGovernance) {
              filePath += '/all';
            } else if (queryIncludeStablecoin && !queryIncludeGovernance) {
              filePath += '/includestablecoin';
            } else if (!queryIncludeStablecoin && queryIncludeGovernance) {
              filePath += '/includegovernance';
            }
            filePath += `-${String(queryKey).toLowerCase()}.json`;
          
            return fileResponse(filePath, res, 30);
        })
    }
}

async function main() {
    console.log('Starting RWA REST Server...');
    console.log('Cache Version:', getCacheVersion());

    // CORS middleware
    webserver.use((_req, res, next) => {
        res.append('Access-Control-Allow-Origin', '*');
        res.append('Access-Control-Allow-Methods', 'GET,OPTIONS');
        res.append('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });

    // Handle OPTIONS requests
    webserver.options('/*', (_req, res) => {
        res.status(200).send();
    });

    // Health check at root level (no auth required)
    webserver.get('/health', (_req, res) => {
        res.send('OK');
    });

    // All other routes under secret subpath
    const router = new HyperExpress.Router();
    webserver.use('/' + RWA_SUBPATH, router);
    setRoutes(router);
    console.log(`Routes mounted at /${RWA_SUBPATH}`);

    // Start server
    webserver
        .listen(port)
        .then(() => {
            console.log(`RWA REST Server started on port ${port}`);
            try {
                process.send!('ready');
            } catch {
                // Not running under PM2, ignore
            }
        })
        .catch((e) => {
            console.error('Failed to start server:', e.message);
            process.exit(1);
        });
}

// Graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
    console.log('Shutting down gracefully...');
    setTimeout(() => process.exit(0), 5000);
    webserver.close(() => {
        console.log('Server shut down gracefully');
        process.exit(0);
    });
}

main();

// Run with: npx ts-node defi/src/rwa/server.ts
