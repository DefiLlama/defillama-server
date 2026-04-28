import fs from 'fs';
import os from 'os';
import path from 'path';

const originalEnv = process.env;

function resetEnv() {
  process.env = { ...originalEnv };
}

function mockInternalRouteDependencies() {
  const readFromPGCache = jest.fn(async (key: string) => {
    if (key.startsWith('/')) throw new Error('Invalid cache key');
    return { key };
  });
  const deleteFromPGCache = jest.fn(async (key: string) => {
    if (key.startsWith('/')) throw new Error('Invalid cache key');
  });
  const clearDimensionsCacheV2 = jest.fn(async () => undefined);

  jest.doMock('../cache/file-cache', () => ({
    readFromPGCache,
    deleteFromPGCache,
  }));
  jest.doMock('../utils/craftProtocolV2', () => ({
    craftProtocolV2: jest.fn(),
  }));
  jest.doMock('../db', () => ({
    getLatestProtocolItems: jest.fn(),
  }));
  jest.doMock('../../utils/getLastRecord', () => ({
    hourlyTokensTvl: {},
    hourlyTvl: {},
    hourlyUsdTokensTvl: {},
  }));
  jest.doMock('../../protocols/data', () => ({
    protocolsById: {},
  }));
  jest.doMock('../utils/dimensionsUtils', () => ({
    clearDimensionsCacheV2,
  }));
  jest.doMock('@defillama/sdk', () => ({
    log: jest.fn(),
  }))

  return { readFromPGCache, deleteFromPGCache, clearDimensionsCacheV2 };
}

function loadDebugHandler() {
  const mocks = mockInternalRouteDependencies();
  const { setInternalRoutes } = require('../routes/internalRoutes');
  const router = {
    get: jest.fn(),
    delete: jest.fn(),
  };

  setInternalRoutes(router as any, '');

  return {
    debugHandler: router.get.mock.calls[0][1],
    ...mocks,
  };
}

function createResponse() {
  const res: any = {
    json: jest.fn(),
    send: jest.fn(),
    status: jest.fn(),
  };

  res.status.mockImplementation(() => res);
  return res;
}

describe('internal debug routes', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    resetEnv();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('rejects unauthenticated debug cache reads when API2_SKIP_SUBPATH is not true', async () => {
    process.env.API2_SKIP_SUBPATH = 'false';
    process.env.LLAMA_INTERNAL_ROUTE_KEY = 'super-secret';

    const { debugHandler, readFromPGCache } = loadDebugHandler();
    const res = createResponse();

    await debugHandler(
      {
        path: '/debug-pg/protocols',
        method: 'GET',
        headers: {},
      },
      res
    );

    expect(readFromPGCache).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized', true);
  });

  test('accepts authenticated debug cache reads', async () => {
    process.env.API2_SKIP_SUBPATH = 'true';
    process.env.LLAMA_INTERNAL_ROUTE_KEY = 'super-secret';

    const { debugHandler, readFromPGCache } = loadDebugHandler();
    const res = createResponse();

    await debugHandler(
      {
        path: '/debug-pg/protocols',
        method: 'GET',
        headers: {
          'x-internal-secret': 'super-secret',
        },
      },
      res
    );

    expect(readFromPGCache).toHaveBeenCalledWith('protocols');
    expect(res.json).toHaveBeenCalledWith({ key: 'protocols' });
  });

  test('clears dimensions cache through the authenticated debug route', async () => {
    process.env.LLAMA_INTERNAL_ROUTE_KEY = 'super-secret';

    const { debugHandler, clearDimensionsCacheV2, deleteFromPGCache } = loadDebugHandler();
    const res = createResponse();

    await debugHandler(
      {
        path: '/debug-pg/clear-dimensions-cache',
        method: 'DELETE',
        headers: {
          'x-internal-secret': 'super-secret',
        },
      },
      res
    );

    expect(clearDimensionsCacheV2).toHaveBeenCalled();
    expect(deleteFromPGCache).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe('pg cache file handling', () => {
  beforeEach(() => {
    jest.resetModules();
    resetEnv();
    jest.unmock('../cache/file-cache');
    jest.doMock('@defillama/sdk', () => ({
      log: jest.fn(),
      util: {
        sliceIntoChunks: jest.fn(),
      },
    }));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('rejects traversal outside the pg-cache directory', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'defillama-cache-'));
    process.env.API2_CACHE_DIR = tempDir;
    const secretPath = path.join(tempDir, 'secret.json');

    fs.writeFileSync(secretPath, JSON.stringify({ data: 'stolen' }));

    const { readFromPGCache, deleteFromPGCache } = require('../cache/file-cache');

    await expect(readFromPGCache('../secret.json')).rejects.toThrow('Invalid cache key');
    await expect(deleteFromPGCache('../secret.json')).rejects.toThrow('Invalid cache key');
    await expect(readFromPGCache('a/..')).rejects.toThrow('Invalid cache key');
    await expect(deleteFromPGCache('a/..')).rejects.toThrow('Invalid cache key');
    expect(fs.existsSync(secretPath)).toBe(true);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
