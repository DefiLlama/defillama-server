import Redis from "ioredis";
import { chInsert, isChEnabled } from "../../utils/clickhouseClient";

let redisClient: Redis | null = null;
let redisEnabled = false;
let initialized = false;

const PRICE_TTL = 86400;

function ensureInit() {
  if (initialized) return;
  initialized = true;

  const sentinelConfig = process.env.REDIS_SENTINEL_CONFIG;
  const redisConfig = process.env.REDIS_SERVING_CONFIG;
  const redisPassword = redisConfig?.split("---")[2] || "";

  if (sentinelConfig) {
    try {
      const sentinels = sentinelConfig.split(",").map(s => { const [host, port] = s.trim().split(":"); return { host, port: parseInt(port) }; });
      redisClient = new Redis({ sentinels, name: "coinsmaster", password: redisPassword, sentinelPassword: undefined, connectTimeout: 3000, commandTimeout: 3000, maxRetriesPerRequest: 1, lazyConnect: true });
      redisClient.on("error", () => {});
      redisEnabled = true;
    } catch {}
  } else if (redisConfig) {
    const [host, port, password] = redisConfig.split("---");
    try {
      redisClient = new Redis({ host, port: Number(port), password, connectTimeout: 3000, commandTimeout: 3000, maxRetriesPerRequest: 1, lazyConnect: true });
      redisClient.on("error", () => {});
      redisEnabled = true;
    } catch {}
  }
}

function pkToCanonicalId(pk: string): string {
  if (pk.startsWith("coingecko#")) return `coingecko:${pk.slice(10)}`;
  if (pk.startsWith("asset#coingecko#")) return `coingecko:${pk.slice(16)}`;
  if (pk.startsWith("asset#")) return pk.slice(6);
  return pk;
}

function pkToChainAddress(pk: string): { chain: string; address: string } | null {
  if (!pk.startsWith("asset#") || pk.startsWith("asset#coingecko#")) return null;
  const body = pk.slice(6);
  const i = body.indexOf(":");
  return i === -1 ? null : { chain: body.slice(0, i), address: body.slice(i + 1) };
}

function esc(s: string): string {
  return (s || "").replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n");
}

function tsDT(ts: number): string {
  if (!ts || ts < 0) return "1970-01-01 00:00:00";
  return new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Dual-write to ClickHouse + Redis after DDB write succeeds.
 * Redis writes are non-fatal (logged on error). CH tries each replica in order.
 * Prices are stored under the original PK canonical form (no redirect resolution)
 * to prevent price pollution from different adapters.
 * Redis receives mappings (address→canonical_id), metadata, and current prices (TTL 24h).
 */
export async function dualWriteToChRedis(writeItems: any[]): Promise<void> {
  ensureInit();
  const chOn = isChEnabled();
  if (!chOn && !redisEnabled) return;
  if (!writeItems || writeItems.length === 0) return;

  const now = Math.floor(Date.now() / 1000);
  const priceRows: string[] = [];
  const tokenRows: string[] = [];
  const addressRows: string[] = [];
  const redisOps: { key: string; value: string; ttl?: number }[] = [];

  for (const item of writeItems) {
    if (!item?.PK) continue;
    const pk = item.PK as string;
    const sk = Number(item.SK ?? -1);
    const cid = pkToCanonicalId(pk);
    if (sk < 0) continue;

    if (sk === 0) {
      // Metadata write (SK=0): update tokens, token_addresses, and Redis mappings
      if (item.symbol) {
        const cgId = pk.startsWith("coingecko#") ? pk.slice(10) : "";
        tokenRows.push([esc(cid), esc(item.symbol || ""), item.decimals || 0, esc(cgId), 1, tsDT(item.timestamp || now), tsDT(now)].join("\t"));
      }

      const parsed = pkToChainAddress(pk);
      if (parsed) {
        const addrCid = item.redirect ? pkToCanonicalId(item.redirect) : cid;
        const redirectTo = item.redirect ? pkToCanonicalId(item.redirect) : "";
        addressRows.push([esc(parsed.chain), esc(parsed.address), esc(addrCid), esc(item.symbol || ""), item.decimals || 0, esc(redirectTo), 1, tsDT(now)].join("\t"));
        if (redisEnabled) redisOps.push({ key: `mapping:${parsed.chain}:${parsed.address}`, value: JSON.stringify({ canonical_id: addrCid, symbol: item.symbol || null, decimals: item.decimals ?? null }) });
      }

      if (pk.startsWith("coingecko#") && redisEnabled) {
        const cgId = pk.slice(10);
        redisOps.push({ key: `mapping:coingecko:${cgId}`, value: JSON.stringify({ canonical_id: cid, symbol: item.symbol || null, decimals: item.decimals ?? null }) });
        redisOps.push({ key: `meta:${cid}`, value: JSON.stringify({ canonicalId: cid, symbol: item.symbol || null, decimals: item.decimals ?? null, coingeckoId: cgId, blacklisted: false, blacklistedFrom: null }) });
      }

      if (item.price && item.price > 0 && redisEnabled) {
        const pCid = item.redirect ? pkToCanonicalId(item.redirect) : cid;
        redisOps.push({ key: `price:${pCid}`, value: JSON.stringify({ price: String(item.price), confidence: item.confidence ?? null, source: item.adapter || null, timestamp: tsDT(item.timestamp || now) }), ttl: PRICE_TTL });
      }
    } else {
      // Price write (SK>0): insert into coins_prices and update Redis current price if recent
      if (item.price && isFinite(item.price)) {
        const chain = pk.startsWith("coingecko#") || pk.startsWith("asset#coingecko#") ? "coingecko" : (pkToChainAddress(pk)?.chain || "unknown");
        priceRows.push([esc(cid), esc(chain), tsDT(sk), tsDT(now), item.price, item.confidence ?? 0, esc(item.adapter || "")].join("\t"));
      }
      if (item.price && item.price > 0 && redisEnabled && (now - sk) < 600) {
        redisOps.push({ key: `price:${cid}`, value: JSON.stringify({ price: String(item.price), confidence: item.confidence ?? null, source: item.adapter || null, timestamp: tsDT(sk) }), ttl: PRICE_TTL });
      }
    }
  }

  // Redis writes first (non-fatal — DDB already has the data)
  if (redisEnabled && redisClient && redisOps.length > 0) {
    try {
      await redisClient.connect().catch(() => {});
      const pipeline = redisClient.pipeline();
      for (const op of redisOps) op.ttl ? pipeline.set(op.key, op.value, "EX", op.ttl) : pipeline.set(op.key, op.value);
      const results = await pipeline.exec();
      const errors = results?.filter(([err]) => err) || [];
      if (errors.length > 0) console.error(`[Redis dual-write] ${errors.length} command errors in pipeline`);
    } catch (e) {
      console.error(`[Redis dual-write] error (non-fatal): ${(e as Error).message}`);
    }
  }

  // CH writes (throws if all replicas fail)
  if (chOn) {
    const promises: Promise<void>[] = [];
    if (priceRows.length > 0) promises.push(chInsert("coins_prices", priceRows.join("\n") + "\n"));
    if (tokenRows.length > 0) promises.push(chInsert("tokens", tokenRows.join("\n") + "\n"));
    if (addressRows.length > 0) promises.push(chInsert("token_addresses", addressRows.join("\n") + "\n"));
    await Promise.all(promises);
  }
}
