import * as HyperExpress from 'hyper-express';
import { readRouteData, getCacheVersion } from './file-cache';
import { perpsSlug } from './utils';
import { initPG, fetchFundingHistoryPG } from './db';

const webserver = new HyperExpress.Server();
const port = +(process.env.RWA_PERPS_PORT ?? 5003);
const RWA_PERPS_SUBPATH = process.env.RWA_PERPS_SUBPATH;

if (!RWA_PERPS_SUBPATH) {
    throw new Error('Missing required environment variable: RWA_PERPS_SUBPATH');
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
    // ── Current data ─────────────────────────────────────────────────────────

    // Get all current perps markets
    router.get(
        '/current',
        errorWrapper(async (_req, res) => {
            return fileResponse('current.json', res, 20);
        })
    );

    // Get lightweight list of markets, coins, venues, categories
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

    // Get ID map (canonical market keys -> id mapping)
    router.get(
        '/id-map',
        errorWrapper(async (_req, res) => {
            return fileResponse('id-map.json', res, 60);
        })
    );

    // ── Single market lookup ─────────────────────────────────────────────────

    // Get specific market by ID (venue:coin)
    router.get(
        '/market/:id',
        errorWrapper(async (req, res) => {
            const { id } = req.params;
            if (!id) return errorResponse(res, 'Missing id parameter', 400);

            const currentData = await readRouteData('current.json');
            if (!currentData) return errorResponse(res, 'Data not found', 500);

            const idParam = String(id).toLowerCase();
            const market = currentData.find((item: any) =>
                typeof item?.id !== 'undefined' && String(item.id).toLowerCase() === idParam
            );

            if (!market) return errorResponse(res, `Market "${id}" not found`, 404);
            return successResponse(res, market, 20);
        })
    );

    // Get markets by canonical market key (for example "xyz:META")
    router.get(
        '/coin/:coin',
        errorWrapper(async (req, res) => {
            const { coin } = req.params;
            if (!coin) return errorResponse(res, 'Missing coin parameter', 400);

            const currentData = await readRouteData('current.json');
            if (!currentData) return errorResponse(res, 'Data not found', 500);

            const coinSlug = perpsSlug(coin);
            const markets = currentData.filter((item: any) =>
                typeof item?.coin !== 'undefined' && perpsSlug(item.coin) === coinSlug
            );

            if (markets.length === 0) return errorResponse(res, `Coin "${coin}" not found`, 404);
            return successResponse(res, markets, 20);
        })
    );

    // ── Filtering ────────────────────────────────────────────────────────────

    // Get markets by venue
    router.get(
        '/venue/:venue',
        errorWrapper(async (req, res) => {
            const { venue } = req.params;
            if (!venue) return errorResponse(res, 'Missing venue parameter', 400);

            const currentData = await readRouteData('current.json');
            if (!currentData) return errorResponse(res, 'Data not found', 500);

            const venueSlug = perpsSlug(venue);
            const filtered = currentData.filter((item: any) =>
                perpsSlug(item.venue) === venueSlug
            );

            return successResponse(res, { data: filtered, total: filtered.length }, 20);
        })
    );

    // Get markets by category
    router.get(
        '/category/:category',
        errorWrapper(async (req, res) => {
            const { category } = req.params;
            if (!category) return errorResponse(res, 'Missing category parameter', 400);

            const currentData = await readRouteData('current.json');
            if (!currentData) return errorResponse(res, 'Data not found', 500);

            const categoryLower = category.toLowerCase();
            const filtered = currentData.filter((item: any) => {
                const categories = Array.isArray(item.category) ? item.category : [item.category || 'Other'];
                return categories.some((cat: string) => cat.toLowerCase() === categoryLower);
            });

            return successResponse(res, { data: filtered, total: filtered.length }, 20);
        })
    );

    // ── Historical charts ────────────────────────────────────────────────────

    // Get historical chart data for a single market by ID
    router.get(
        '/chart/:id',
        errorWrapper(async (req, res) => {
            const { id } = req.params;
            if (!id) return errorResponse(res, 'Missing id parameter', 400);
            return fileResponse(`charts/${id}.json`, res, 30);
        })
    );

    // Get historical constituent chart rows by venue
    router.get(
        '/chart/venue/:venue',
        errorWrapper(async (req, res) => {
            const { venue } = req.params;
            if (!venue) return errorResponse(res, 'Missing venue parameter', 400);
            const key = perpsSlug(venue);
            return fileResponse(`charts/venue/${key}.json`, res, 30);
        })
    );

    // Get historical constituent chart rows by category
    router.get(
        '/chart/category/:category',
        errorWrapper(async (req, res) => {
            const { category } = req.params;
            if (!category) return errorResponse(res, 'Missing category parameter', 400);
            const key = perpsSlug(category);
            return fileResponse(`charts/category/${key}.json`, res, 30);
        })
    );

    // ── Funding history ──────────────────────────────────────────────────────

    // Get funding history for a specific market
    router.get(
        '/funding/:id',
        errorWrapper(async (req, res) => {
            const { id } = req.params;
            if (!id) return errorResponse(res, 'Missing id parameter', 400);

            const startTime = req.query.startTime ? Number(req.query.startTime) : undefined;
            const endTime = req.query.endTime ? Number(req.query.endTime) : undefined;

            const history = await fetchFundingHistoryPG(id.toLowerCase(), startTime, endTime);
            return successResponse(res, {
                id,
                data: history,
                total: history.length,
            }, 10);
        })
    );
}

async function main() {
    console.log('Starting RWA Perps REST Server...');
    console.log('Cache Version:', getCacheVersion());

    // Initialize DB for funding history endpoint
    await initPG();

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

    // Health check
    webserver.get('/health', (_req, res) => {
        res.send('OK');
    });

    // All routes under secret subpath
    const router = new HyperExpress.Router();
    webserver.use('/' + RWA_PERPS_SUBPATH, router);
    setRoutes(router);
    console.log(`Routes mounted at /${RWA_PERPS_SUBPATH}`);

    // Start server
    webserver
        .listen(port)
        .then(() => {
            console.log(`RWA Perps REST Server started on port ${port}`);
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
