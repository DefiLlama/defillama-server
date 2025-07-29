import dotenv from 'dotenv';
import fs from 'fs/promises';
import * as HyperExpress from 'hyper-express';
import fetch from 'node-fetch';
import path from 'path';
import { readFileData, storeData } from './file-cache';
dotenv.config();

const CACHE_SUBDIR = 'endpoints';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_TTL_MS = 60_000 * 60 * 6;
const MIN_REFRESH_SEC_HARD = 15 * 60;

const ALLOWED_HOSTS = new Set(['api.llama.fi', 'localhost:5001']);

const CACHE_ROOT =process.env.API2_CACHE_DIR ?? path.join(process.cwd(), 'defi', 'src', 'api2', '.api2-cache');
const ENDPOINT_DIR = path.join(CACHE_ROOT, CACHE_SUBDIR);

const flatten = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');

const baseKey = (raw: string) => {
  const { pathname, search } = new URL(raw);
  return flatten((pathname + search).replace(/^\/+/, ''));
};

const isErrorPayload = (d: any) =>
  typeof d === 'object' && d !== null && 'error' in d;

const isAllowedHost = (raw: string) => {
  try {
    return ALLOWED_HOSTS.has(new URL(raw).host);
  } catch {
    return false;
  }
};

const ensureDir = async () => fs.mkdir(ENDPOINT_DIR, { recursive: true });

const purgeOld = async (base: string) => {
  await ensureDir();
  const files = await fs.readdir(ENDPOINT_DIR);
  await Promise.all(
    files.filter(f => f.startsWith(base + '-'))
         .map(f => fs.unlink(path.join(ENDPOINT_DIR, f)).catch(() => {}))
  );
};

const latestFile = async (base: string) => {
  await ensureDir();
  const files = await fs.readdir(ENDPOINT_DIR);
  return (
    files
      .filter(f => f.startsWith(base + '-'))
      .map(f => {
        const ts = Number(f.slice(base.length + 1, -5));
        return { file: f, ts };
      })
      .filter(x => !isNaN(x.ts))
      .sort((a, b) => b.ts - a.ts)[0] ?? null
  );
};

async function fetchWithTimeout(url: string, ms: number) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = r.headers.get('content-type') ?? '';
    return ct.includes('application/json') ? await r.json() : await r.text();
  } finally {
    clearTimeout(timer);
  }
}

export default function setApiFetchCacheRoute(router: HyperExpress.Router) {
  router.get('/cache', async (req, res) => {
    const api = req.query_parameters.api;
    if (!api)return res.status(400).json({ error: '`api` query param missing' });

    if (!isAllowedHost(api)) return res.status(400).json({ error: 'host not allowed' });

    const timeoutMs = Number(req.query_parameters.timeout ?? DEFAULT_TIMEOUT_MS / 1_000) * 1_000;

    const ttlMs = Number(req.query_parameters.ttl ?? DEFAULT_TTL_MS / 1_000) * 1_000;

    const requested = Number(req.query_parameters.minRefresh);
    const minRefreshSec = isNaN(requested) || requested <= 0 ? MIN_REFRESH_SEC_HARD : Math.max(MIN_REFRESH_SEC_HARD, requested);
    const minRefreshMs = minRefreshSec * 1_000;

    const base = baseKey(api);
    const latest = await latestFile(base);

    try {
      const data = await fetchWithTimeout(api, timeoutMs);

      const isEmptyObj =typeof data === 'object' && data !== null && Object.keys(data).length === 0;
      const isEmpty = data === null || data === undefined || isEmptyObj;

      const ageOk = !latest || Date.now() - latest.ts * 1_000 > minRefreshMs;

      if (!isEmpty && !isErrorPayload(data) && ageOk) {
        await purgeOld(base);
        const tsSec = Math.floor(Date.now() / 1_000);
        await storeData(path.join(CACHE_SUBDIR, `${base}-${tsSec}.json`), { ts: tsSec, data } );
      }

      res.setHeader('X-Cache', 'MISS');
      return res.json(data);
    } catch (err) {
      const e = err as any;
      const reason = e.name === 'AbortError'? `timeout (${timeoutMs} ms)`: e.message || 'unknown error';
      console.warn(`[cache] ${base} → fallback (${reason})`);
    }

    if (latest && Date.now() - latest.ts * 1_000 < ttlMs) {
      res.setHeader('X-Cache', 'HIT');
      const cached = await readFileData(path.join(CACHE_SUBDIR, latest.file));
      return res.json(cached.data);
    }

    res.setHeader('X-Cache', 'MISS');
    return res.status(504).json({ error: 'Gateway Timeout and no cache' });
  });
}
