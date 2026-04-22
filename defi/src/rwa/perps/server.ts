import * as HyperExpress from 'hyper-express';
import { readRouteData, getCacheVersion } from './file-cache';
import { initPG, fetchFundingHistoryPG } from './db';
import { perpsSlug } from './utils';
import {
    findMarketById,
    findMarketsByAssetGroup,
    findMarketsByCategory,
    findMarketsByContract,
    findMarketsByVenue,
    getPerpsContractBreakdownFilePath,
    getPerpsOverviewBreakdownFilePath,
    parsePerpsChartTarget,
    resolvePerpsLookupId,
} from './server-helpers';

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

export function setRoutes(router: HyperExpress.Router): void {
    // ── Current data ─────────────────────────────────────────────────────────

    router.get(
        '/current',
        errorWrapper(async (_req, res) => {
            return fileResponse('current.json', res, 20);
        })
    );

    // Get lightweight list of markets, contracts, venues, categories
    router.get(
        '/list',
        errorWrapper(async (_req, res) => {
            return fileResponse('list.json', res, 30);
        })
    );

    router.get(
        '/stats',
        errorWrapper(async (_req, res) => {
            return fileResponse('stats.json', res, 20);
        })
    );

    router.get(
        '/id-map',
        errorWrapper(async (_req, res) => {
            return fileResponse('id-map.json', res, 60);
        })
    );

    // ── Single market lookup ─────────────────────────────────────────────────

    router.get(
        '/market/:id',
        errorWrapper(async (req, res) => {
            const { id } = req.params;
            if (!id) return errorResponse(res, 'Missing id parameter', 400);

            const idMap = await readRouteData('id-map.json');
            const currentData = await readRouteData('current.json');
            if (!currentData) return errorResponse(res, 'Data not found', 500);

            const resolvedId = resolvePerpsLookupId(idMap, id);
            const market = findMarketById(currentData, resolvedId || id);
            if (!market) return errorResponse(res, `Market "${id}" not found`, 404);
            return successResponse(res, market, 20);
        })
    );

    // ── Filtering by contract / venue / category ──────────────────────────

    function filterRoute(
        paramName: string,
        filterFn: (data: any[], value: string) => any[],
    ) {
        return errorWrapper(async (req: HyperExpress.Request, res: HyperExpress.Response) => {
            const value = req.params[paramName];
            if (!value) return errorResponse(res, `Missing ${paramName} parameter`, 400);

            const currentData = await readRouteData('current.json');
            if (!currentData) return errorResponse(res, 'Data not found', 500);

            const results = filterFn(currentData, value);
            if (results.length === 0) return errorResponse(res, `${paramName} "${value}" not found`, 404);
            return successResponse(res, results, 20);
        });
    }

    router.get('/contract/:contract', filterRoute('contract', findMarketsByContract));
    router.get('/venue/:venue', filterRoute('venue', findMarketsByVenue));
    router.get('/category/:category', filterRoute('category', findMarketsByCategory));

    router.get(
        '/assetGroup/:assetGroup',
        errorWrapper(async (req, res) => {
            const { assetGroup } = req.params;
            if (!assetGroup) return errorResponse(res, 'Missing assetGroup parameter', 400);

            const currentData = await readRouteData('current.json');
            if (!currentData) return errorResponse(res, 'Data not found', 500);

            return successResponse(res, findMarketsByAssetGroup(currentData, assetGroup), 20);
        })
    );

    // ── Historical charts ────────────────────────────────────────────────────

    router.get(
        '/chart/overview-breakdown',
        errorWrapper(async (req, res) => {
            const target = parsePerpsChartTarget({
                venue: req.query.venue,
                assetGroup: req.query.assetGroup,
            });
            if (!target) return errorResponse(res, 'Invalid target query parameters', 400);

            const filePath = getPerpsOverviewBreakdownFilePath({
                target,
                key: req.query.key,
                breakdown: req.query.breakdown,
            });
            if (!filePath) return errorResponse(res, 'Invalid query parameters', 400);

            return fileResponse(filePath, res, 30);
        })
    );

    router.get(
        '/chart/contract-breakdown',
        errorWrapper(async (req, res) => {
            const target = parsePerpsChartTarget({
                venue: req.query.venue,
                assetGroup: req.query.assetGroup,
            });
            if (!target) return errorResponse(res, 'Invalid target query parameters', 400);

            const filePath = getPerpsContractBreakdownFilePath({
                target,
                key: req.query.key,
            });
            if (!filePath) return errorResponse(res, 'Invalid query parameters', 400);

            return fileResponse(filePath, res, 30);
        })
    );

    router.get(
        '/chart/venue/:venue',
        errorWrapper(async (req, res) => {
            const { venue } = req.params;
            if (!venue) return errorResponse(res, 'Missing venue parameter', 400);
            return fileResponse(`charts/venue/${perpsSlug(venue)}.json`, res, 30);
        })
    );

    router.get(
        '/chart/category/:category',
        errorWrapper(async (req, res) => {
            const { category } = req.params;
            if (!category) return errorResponse(res, 'Missing category parameter', 400);
            return fileResponse(`charts/category/${perpsSlug(category)}.json`, res, 30);
        })
    );

    router.get(
        '/chart/:id',
        errorWrapper(async (req, res) => {
            const { id } = req.params;
            if (!id) return errorResponse(res, 'Missing id parameter', 400);

            const idMap = await readRouteData('id-map.json');
            const resolvedId = resolvePerpsLookupId(idMap, id);
            return fileResponse(`charts/${resolvedId || id}.json`, res, 30);
        })
    );

    // ── Funding history ──────────────────────────────────────────────────────

    router.get(
        '/funding/:id',
        errorWrapper(async (req, res) => {
            const { id } = req.params;
            if (!id) return errorResponse(res, 'Missing id parameter', 400);

            const idMap = await readRouteData('id-map.json');
            const resolvedId = resolvePerpsLookupId(idMap, id);
            const startTime = req.query.startTime ? Number(req.query.startTime) : undefined;
            const endTime = req.query.endTime ? Number(req.query.endTime) : undefined;

            const history = await fetchFundingHistoryPG((resolvedId || id).toLowerCase(), startTime, endTime);
            return successResponse(res, history, 10);
        })
    );
}

export function createPerpsServer(subpath: string): HyperExpress.Server {
    const webserver = new HyperExpress.Server();

    webserver.use((_req, res, next) => {
        res.append('Access-Control-Allow-Origin', '*');
        res.append('Access-Control-Allow-Methods', 'GET,OPTIONS');
        res.append('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });

    webserver.options('/*', (_req, res) => {
        res.status(200).send();
    });

    webserver.get('/health', (_req, res) => {
        res.send('OK');
    });

    const router = new HyperExpress.Router();
    webserver.use('/' + subpath, router);
    setRoutes(router);

    return webserver;
}

export async function main() {
    const subpath = process.env.RWA_PERPS_SUBPATH;
    if (!subpath) {
        throw new Error('Missing required environment variable: RWA_PERPS_SUBPATH');
    }

    const port = +(process.env.RWA_PERPS_PORT ?? 5003);
    const webserver = createPerpsServer(subpath);

    console.log('Starting RWA Perps REST Server...');
    console.log('Cache Version:', getCacheVersion());

    await initPG();
    console.log(`Routes mounted at /${subpath}`);

    try {
        await webserver.listen(port);
        console.log(`RWA Perps REST Server started on port ${port}`);
        try {
            process.send!('ready');
        } catch {
            // Not running under PM2, ignore
        }
    } catch (e: any) {
        console.error('Failed to start server:', e.message);
        process.exit(1);
    }

    const shutdown = () => {
        console.log('Shutting down gracefully...');
        setTimeout(() => process.exit(0), 5000);
        webserver.close(() => {
            console.log('Server shut down gracefully');
            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

if (require.main === module) {
    void main();
}
