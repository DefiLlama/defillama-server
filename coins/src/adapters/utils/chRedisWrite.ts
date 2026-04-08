import * as http from "http";
import Redis from "ioredis";

interface ChHost { host: string; port: number; }

let chHosts: ChHost[] = [];
let chUser = "default";
let chPassword = "";
let chEnabled = false;
let redisClient: Redis | null = null;
let redisEnabled = false;

const PRICE_TTL = 86400;

function init() {
  const hostsConfig = process.env.CH_WRITE_HOSTS;
  if (hostsConfig) {
    chHosts = hostsConfig.split(",").map(h => {
      const [host, port] = h.trim().split(":");
      return { host, port: parseInt(port) };
    });
    chUser = process.env.CH_WRITE_USER || "default";
    chPassword = process.env.CH_WRITE_PASSWORD || "";
    chEnabled = chHosts.length > 0;
  }

  const sentinelConfig = process.env.REDIS_SENTINEL_CONFIG; // host1:port1,host2:port2,host3:port3
  const redisConfig = process.env.REDIS_SERVING_CONFIG;     // host---port---password (direct, fallback)
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

init();

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

const chAgent = new http.Agent({ keepAlive: true, maxSockets: 4 });

function chInsertOn(h: ChHost, table: string, body: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `/?user=${chUser}&password=${encodeURIComponent(chPassword)}&query=${encodeURIComponent(`INSERT INTO ${table} FORMAT TabSeparated`)}`;
    const req = http.request({ hostname: h.host, port: h.port, path: url, method: "POST", agent: chAgent, timeout: 10000 }, (res) => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => res.statusCode && res.statusCode >= 400 ? reject(new Error(`CH ${res.statusCode}: ${d.slice(0, 200)}`)) : resolve());
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("CH timeout")); });
    req.write(body);
    req.end();
  });
}

async function chInsert(table: string, body: string): Promise<void> {
  for (let i = 0; i < chHosts.length; i++) {
    try { await chInsertOn(chHosts[i], table, body); return; }
    catch (e) {
      if (i === chHosts.length - 1) throw e;
      console.error(`[CH dual-write] ${chHosts[i].host}:${chHosts[i].port} failed, trying next: ${(e as Error).message}`);
    }
  }
}

export async function dualWriteToChRedis(writeItems: any[]): Promise<void> {
  if (!chEnabled && !redisEnabled) return;
  if (!writeItems || writeItems.length === 0) return;

  const now = Math.floor(Date.now() / 1000);
  const priceRows: string[] = [];
  const tokenRows: string[] = [];
  const addressRows: string[] = [];
  const redisOps: { key: string; value: string; ttl?: number }[] = [];

  for (const item of writeItems) {
    if (!item?.PK) continue;
    const pk = item.PK as string;
    const sk = item.SK as number;
    const cid = pkToCanonicalId(pk);

    if (sk === 0) {
      if (item.symbol) {
        const cgId = pk.startsWith("coingecko#") ? pk.slice(10) : "";
        tokenRows.push([esc(cid), esc(item.symbol || ""), item.decimals || 0, esc(cgId), 1, tsDT(item.timestamp || now), tsDT(now)].join("\t"));
      }

      const parsed = pkToChainAddress(pk);
      if (parsed) {
        const addrCid = item.redirect ? pkToCanonicalId(item.redirect) : cid;
        const redirectTo = item.redirect ? pkToCanonicalId(item.redirect) : "";
        addressRows.push([esc(parsed.chain), esc(parsed.address), esc(addrCid), esc(item.symbol || ""), item.decimals || 0, esc(redirectTo), 1, tsDT(now)].join("\t"));
        if (redisEnabled) redisOps.push({ key: `mapping:${parsed.chain}:${parsed.address}`, value: JSON.stringify({ canonical_id: addrCid, symbol: item.symbol || null, decimals: item.decimals || null }) });
      }

      if (pk.startsWith("coingecko#") && redisEnabled) {
        const cgId = pk.slice(10); // raw coingecko id without namespace
        redisOps.push({ key: `mapping:coingecko:${cgId}`, value: JSON.stringify({ canonical_id: cid, symbol: item.symbol || null, decimals: item.decimals || null }) });
        redisOps.push({ key: `meta:${cid}`, value: JSON.stringify({ canonicalId: cid, symbol: item.symbol || null, decimals: item.decimals || null, coingeckoId: cgId, blacklisted: false, blacklistedFrom: null }) });
      }

      if (item.price && item.price > 0 && redisEnabled) {
        const pCid = item.redirect ? pkToCanonicalId(item.redirect) : cid;
        redisOps.push({ key: `price:${pCid}`, value: JSON.stringify({ price: String(item.price), confidence: item.confidence || null, source: item.adapter || null, timestamp: tsDT(item.timestamp || now) }), ttl: PRICE_TTL });
      }
    } else {
      if (item.price && isFinite(item.price)) {
        const chain = pk.startsWith("coingecko#") || pk.startsWith("asset#coingecko#") ? "coingecko" : (pkToChainAddress(pk)?.chain || "unknown");
        priceRows.push([esc(cid), esc(chain), tsDT(sk), tsDT(now), item.price, item.confidence || 0, esc(item.adapter || "")].join("\t"));
      }
      if (item.price && item.price > 0 && redisEnabled && (now - sk) < 600) {
        redisOps.push({ key: `price:${cid}`, value: JSON.stringify({ price: String(item.price), confidence: item.confidence || null, source: item.adapter || null, timestamp: tsDT(sk) }), ttl: PRICE_TTL });
      }
    }
  }

  if (redisEnabled && redisClient && redisOps.length > 0) {
    try {
      await redisClient.connect().catch(() => {});
      const pipeline = redisClient.pipeline();
      for (const op of redisOps) op.ttl ? pipeline.set(op.key, op.value, "EX", op.ttl) : pipeline.set(op.key, op.value);
      await pipeline.exec();
    } catch (e) {
      console.error(`[Redis dual-write] error (non-fatal): ${(e as Error).message}`);
    }
  }

  if (chEnabled) {
    const promises: Promise<void>[] = [];
    if (priceRows.length > 0) promises.push(chInsert("coins_prices", priceRows.join("\n") + "\n"));
    if (tokenRows.length > 0) promises.push(chInsert("tokens", tokenRows.join("\n") + "\n"));
    if (addressRows.length > 0) promises.push(chInsert("token_addresses", addressRows.join("\n") + "\n"));
    await Promise.all(promises);
  }
}
