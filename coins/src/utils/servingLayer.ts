import Redis from "ioredis";
import * as http from "http";

export type CoinsResponse = {
  [coin: string]: {
    decimals?: number;
    price: number;
    timestamp: number;
    symbol: string;
    confidence?: number;
  };
};

const FORCE_DDB = process.env.SERVING_FORCE_DDB === "true";
const SKIP_REDIS = process.env.SERVING_SKIP_REDIS === "true";
const SKIP_CH = process.env.SERVING_SKIP_CH === "true";
const REDIS_DISABLE_DURATION = 60000;
const REDIS_MIN_DBSIZE = 1000;

let servingRedis: Redis | null = null;
let redisDisabled = false;
let redisDisabledUntil = 0;

function getServingRedis(): Redis | null {
  if (FORCE_DDB || SKIP_REDIS) return null;
  if (redisDisabled && Date.now() < redisDisabledUntil) return null;
  if (redisDisabled && Date.now() >= redisDisabledUntil) redisDisabled = false;

  if (servingRedis) return servingRedis;
  const sentinelConfig = process.env.REDIS_SENTINEL_CONFIG;
  const config = process.env.REDIS_SERVING_CONFIG;
  const password = config?.split("---")[2] || "";

  if (!sentinelConfig && !config) return null;
  try {
    if (sentinelConfig) {
      const sentinels = sentinelConfig.split(",").map(s => { const [h, p] = s.trim().split(":"); return { host: h, port: parseInt(p) }; });
      servingRedis = new Redis({ sentinels, name: "coinsmaster", password, connectTimeout: 2000, commandTimeout: 2000, maxRetriesPerRequest: 1, lazyConnect: true });
    } else {
      const [host, port, pw] = config!.split("---");
      servingRedis = new Redis({ host, port: Number(port), password: pw, connectTimeout: 2000, commandTimeout: 2000, maxRetriesPerRequest: 1, lazyConnect: true });
    }
    servingRedis.on("error", () => {});
    return servingRedis;
  } catch {
    return null;
  }
}

function disableRedisTemporarily(reason: string) {
  redisDisabled = true;
  redisDisabledUntil = Date.now() + REDIS_DISABLE_DURATION;
  console.error(`[Serving] Redis disabled for ${REDIS_DISABLE_DURATION / 1000}s: ${reason}`);
}

interface ChConfig { hosts: { host: string; port: number }[]; user: string; password: string; }
let chConfig: ChConfig | null = null;

function getChConfig(): ChConfig | null {
  if (FORCE_DDB || SKIP_CH) return null;
  if (chConfig) return chConfig;
  const hostsStr = process.env.CH_WRITE_HOSTS || process.env.CH_HOST;
  if (!hostsStr) return null;
  const hosts = hostsStr.includes(",")
    ? hostsStr.split(",").map(h => { const [host, port] = h.trim().split(":"); return { host, port: parseInt(port) }; })
    : [{ host: hostsStr, port: parseInt(process.env.CH_PORT || process.env.CH_WRITE_PORT || "8124") }];
  chConfig = { hosts, user: process.env.CH_WRITE_USER || process.env.CH_USER || "default", password: process.env.CH_WRITE_PASSWORD || process.env.CH_PASSWORD || "" };
  return chConfig;
}

function chQuery(config: ChConfig, query: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    for (const host of config.hosts) {
      try {
        const result = await new Promise<string>((res, rej) => {
          const url = `/?user=${config.user}&password=${encodeURIComponent(config.password)}&query=${encodeURIComponent(query)}`;
          const req = http.request({ hostname: host.host, port: host.port, path: url, method: "GET", timeout: 10000 }, (resp) => {
            let data = "";
            resp.on("data", (c) => (data += c));
            resp.on("end", () => (resp.statusCode && resp.statusCode >= 400 ? rej(new Error(data.slice(0, 200))) : res(data)));
          });
          req.on("error", rej);
          req.on("timeout", () => { req.destroy(); rej(new Error("CH timeout")); });
          req.end();
        });
        resolve(result);
        return;
      } catch (e) {
        if (host === config.hosts[config.hosts.length - 1]) reject(e);
      }
    }
  });
}

function normalizeInput(coin: string): string {
  if (coin.startsWith("coingecko:")) return coin.toLowerCase();
  const i = coin.indexOf(":");
  if (i === -1) return coin.toLowerCase();
  return coin.slice(0, i).toLowerCase() + ":" + coin.slice(i + 1).toLowerCase();
}

export async function redisCurrentPrices(requestedCoins: string[]): Promise<CoinsResponse | null> {
  const redis = getServingRedis();
  if (!redis) return null;

  try {
    await redis.connect().catch(() => {});
    const [dbsize, bootstrapOk] = await Promise.all([redis.dbsize(), redis.get("_bootstrap:ok")]);
    if (dbsize < REDIS_MIN_DBSIZE || !bootstrapOk) {
      console.warn(`[Serving] Redis needs rebuild (${dbsize} keys, bootstrap:${bootstrapOk ? "ok" : "missing"})`);
      triggerRedisRebuild().catch(() => {});
      return null;
    }

    const normalized = requestedCoins.map(normalizeInput);
    const mappingKeys = normalized.map(c => c.startsWith("coingecko:") ? `mapping:coingecko:${c.slice(10)}` : `mapping:${c}`);
    const rawMappings = await redis.mget(...mappingKeys);
    const mappings = rawMappings.map(raw => { if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } });

    const uniqueIds = [...new Set(mappings.filter(Boolean).map((m: any) => m.canonical_id as string))];
    if (uniqueIds.length === 0) return null;

    const priceResults = await redis.mget(...uniqueIds.map(id => `price:${id}`));
    const priceMap = new Map<string, any>();
    uniqueIds.forEach((id, i) => { if (priceResults[i]) priceMap.set(id, JSON.parse(priceResults[i]!)); });

    const response: CoinsResponse = {};
    let hits = 0;
    requestedCoins.forEach((coin, i) => {
      const mapping = mappings[i];
      if (!mapping) return;
      const price = priceMap.get(mapping.canonical_id);
      if (!price) return;
      response[coin] = {
        decimals: mapping.decimals ?? undefined,
        symbol: mapping.symbol ?? "",
        price: parseFloat(price.price),
        timestamp: typeof price.timestamp === "string" ? Math.floor(new Date(price.timestamp).getTime() / 1000) : price.timestamp,
        confidence: price.confidence ?? undefined,
      };
      hits++;
    });

    if (hits < requestedCoins.length * 0.5) return null;
    return response;
  } catch (e) {
    disableRedisTemporarily((e as Error).message);
    return null;
  }
}

export async function chCurrentPrices(requestedCoins: string[]): Promise<CoinsResponse | null> {
  const config = getChConfig();
  if (!config) return null;

  try {
    const normalized = requestedCoins.map(normalizeInput);
    const resolvedMap = new Map<string, { canonical_id: string; symbol: string; decimals: number }>();

    const addrCoins = normalized.filter(c => !c.startsWith("coingecko:"));
    if (addrCoins.length > 0) {
      const conditions = addrCoins.map(c => { const i = c.indexOf(":"); return `(chain = '${c.slice(0, i).replace(/'/g, "''")}' AND address = '${c.slice(i + 1).replace(/'/g, "''")}')`;});
      const raw = await chQuery(config, `SELECT chain, address, canonical_id, symbol, decimals FROM token_addresses WHERE ${conditions.join(" OR ")} FORMAT JSONCompact`);
      for (const row of JSON.parse(raw).data) resolvedMap.set(`${row[0]}:${row[1]}`, { canonical_id: row[2], symbol: row[3], decimals: parseInt(row[4]) });
    }

    const cgCoins = normalized.filter(c => c.startsWith("coingecko:"));
    if (cgCoins.length > 0) {
      const inList = cgCoins.map(c => `'${c.replace(/'/g, "''")}'`).join(",");
      const raw = await chQuery(config, `SELECT canonical_id, symbol, decimals FROM tokens WHERE canonical_id IN (${inList}) FORMAT JSONCompact`);
      for (const row of JSON.parse(raw).data) resolvedMap.set(row[0], { canonical_id: row[0], symbol: row[1], decimals: parseInt(row[2]) });
    }

    const allMappings = normalized.map(c => resolvedMap.get(c) || null);
    const uniqueCids = [...new Set(allMappings.filter(Boolean).map(m => m!.canonical_id))];
    if (uniqueCids.length === 0) return null;

    const inList = uniqueCids.map(c => `'${c.replace(/'/g, "''")}'`).join(",");
    const priceRaw = await chQuery(config, `SELECT canonical_id, argMax(price, timestamp) AS price, argMax(confidence, timestamp) AS confidence, argMax(adapter, timestamp) AS adapter, max(timestamp) AS ts FROM coins_prices WHERE canonical_id IN (${inList}) GROUP BY canonical_id FORMAT JSONCompact`);
    const priceMap = new Map<string, any>();
    for (const row of JSON.parse(priceRaw).data) priceMap.set(row[0], { price: parseFloat(row[1]), confidence: parseFloat(row[2]), source: row[3], timestamp: row[4] });

    const response: CoinsResponse = {};
    let hits = 0;
    requestedCoins.forEach((coin, i) => {
      const mapping = allMappings[i];
      if (!mapping) return;
      const price = priceMap.get(mapping.canonical_id);
      if (!price) return;
      response[coin] = {
        decimals: mapping.decimals || undefined,
        symbol: mapping.symbol || "",
        price: price.price,
        timestamp: typeof price.timestamp === "string" ? Math.floor(new Date(price.timestamp).getTime() / 1000) : price.timestamp,
        confidence: price.confidence || undefined,
      };
      hits++;
    });

    if (hits < requestedCoins.length * 0.3) return null;
    return response;
  } catch (e) {
    console.error(`[Serving] CH fallback error: ${(e as Error).message}`);
    return null;
  }
}

let rebuildInProgress = false;

async function triggerRedisRebuild(): Promise<void> {
  if (rebuildInProgress) return;
  rebuildInProgress = true;
  try {
    const redis = getServingRedis();
    const config = getChConfig();
    if (!redis || !config) return;

    console.log("[Serving] Starting Redis auto-rebuild from CH...");
    const tokensRaw = await chQuery(config, "SELECT canonical_id, symbol, decimals, coingecko_id FROM tokens WHERE is_active = 1 FORMAT TabSeparated");
    const tokens = tokensRaw.trim().split("\n").filter(Boolean).map(line => { const [cid, symbol, decimals, cgId] = line.split("\t"); return { cid, symbol, decimals, cgId }; });

    const addrsRaw = await chQuery(config, "SELECT chain, address, canonical_id, symbol, decimals FROM token_addresses WHERE is_active = 1 FORMAT TabSeparated");
    const addrs = addrsRaw.trim().split("\n").filter(Boolean).map(line => { const [chain, address, cid, symbol, decimals] = line.split("\t"); return { chain, address, cid, symbol, decimals }; });

    const pricesRaw = await chQuery(config, "SELECT canonical_id, argMax(price, timestamp) AS price, argMax(confidence, timestamp) AS confidence, argMax(adapter, timestamp) AS adapter, max(timestamp) AS latest_ts FROM coins_prices GROUP BY canonical_id FORMAT TabSeparated");
    const prices = pricesRaw.trim().split("\n").filter(Boolean).map(line => { const [cid, price, confidence, adapter, ts] = line.split("\t"); return { cid, price, confidence, adapter, ts }; });
    const priceMap = new Map(prices.map(p => [p.cid, p]));

    await redis.connect().catch(() => {});
    const BATCH = 5000;

    for (let i = 0; i < addrs.length; i += BATCH) {
      const pipeline = redis.pipeline();
      for (const a of addrs.slice(i, i + BATCH)) pipeline.set(`mapping:${a.chain}:${a.address}`, JSON.stringify({ canonical_id: a.cid, symbol: a.symbol || null, decimals: parseInt(a.decimals) || null }));
      await pipeline.exec();
    }
    for (let i = 0; i < tokens.length; i += BATCH) {
      const pipeline = redis.pipeline();
      for (const t of tokens.slice(i, i + BATCH)) {
        if (t.cgId) pipeline.set(`mapping:coingecko:${t.cgId}`, JSON.stringify({ canonical_id: t.cid, symbol: t.symbol || null, decimals: parseInt(t.decimals) || null }));
        pipeline.set(`meta:${t.cid}`, JSON.stringify({ canonicalId: t.cid, symbol: t.symbol || null, decimals: parseInt(t.decimals) || null, coingeckoId: t.cgId || null, blacklisted: false, blacklistedFrom: null }));
      }
      await pipeline.exec();
    }
    for (let i = 0; i < tokens.length; i += BATCH) {
      const pipeline = redis.pipeline();
      for (const t of tokens.slice(i, i + BATCH)) {
        const p = priceMap.get(t.cid);
        if (p?.price && p.price !== "0") pipeline.set(`price:${t.cid}`, JSON.stringify({ price: p.price, confidence: parseFloat(p.confidence) || null, source: p.adapter || null, timestamp: p.ts || null }), "EX", 86400);
      }
      await pipeline.exec();
    }

    await redis.set("_bootstrap:ok", Date.now().toString());
    console.log(`[Serving] Redis rebuild complete: ${await redis.dbsize()} keys`);
  } catch (e) {
    console.error(`[Serving] Redis rebuild failed: ${(e as Error).message}`);
  } finally {
    rebuildInProgress = false;
  }
}

let healthCheckInterval: NodeJS.Timeout | null = null;
function startHealthCheck() {
  if (healthCheckInterval || FORCE_DDB) return;
  healthCheckInterval = setInterval(async () => {
    const redis = getServingRedis();
    if (!redis) return;
    try {
      await redis.connect().catch(() => {});
      const [dbsize, bootstrapOk] = await Promise.all([redis.dbsize(), redis.get("_bootstrap:ok")]);
      if (dbsize < REDIS_MIN_DBSIZE || !bootstrapOk) {
        console.warn(`[Serving] Health check: rebuild needed (${dbsize} keys, bootstrap:${bootstrapOk ? "ok" : "missing"})`);
        triggerRedisRebuild().catch(() => {});
      }
    } catch {}
  }, 5 * 60 * 1000);
}
startHealthCheck();
