import * as http from "http";
import Redis from "ioredis";

const DRY_RUN = process.env.DRY_RUN !== "false";
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "5000", 10);
const PAGE_SIZE = parseInt(process.env.PAGE_SIZE || "50000", 10);
const CH_HOST = process.env.CH_HOST || "localhost";
const CH_PORT = parseInt(process.env.CH_PORT || "8124", 10);
const CH_USER = process.env.CH_USER || "default";
const CH_PASSWORD = process.env.CH_PASSWORD || "";
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6380", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
const PRICE_TTL = 86400;

function chQuery(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `/?user=${CH_USER}&password=${encodeURIComponent(CH_PASSWORD)}&query=${encodeURIComponent(query)}&enable_http_compression=1`;
    const req = http.request({ hostname: CH_HOST, port: CH_PORT, path: url, method: "GET", timeout: 300000, headers: { "Accept-Encoding": "gzip" } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        let body = Buffer.concat(chunks);
        if (res.headers["content-encoding"] === "gzip") {
          body = require("zlib").gunzipSync(body);
        }
        const data = body.toString();
        res.statusCode && res.statusCode >= 400 ? reject(new Error(data.slice(0, 500))) : resolve(data);
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("CH timeout")); });
    req.end();
  });
}

function parseTSV(data: string, columns: string[]): Record<string, string>[] {
  return data.trim().split("\n").filter(Boolean).map(line => {
    const fields = line.split("\t");
    const row: Record<string, string> = {};
    columns.forEach((col, i) => row[col] = fields[i] || "");
    return row;
  });
}

async function main() {
  console.log(`Bootstrap Redis from CH (${CH_HOST}:${CH_PORT}) → Redis (${REDIS_HOST}:${REDIS_PORT})`);

  await chQuery("SELECT 1 FORMAT TabSeparated");
  let redis: Redis | null = null;
  if (!DRY_RUN) {
    redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD || undefined });
    await redis.ping();
  }
  if (DRY_RUN || !redis) { console.log("DRY_RUN — no writes."); return; }

  let totalOps = 0;

  // ── Tokens: load all, push mappings + meta ──
  console.log("Loading tokens...");
  let offset = 0;
  while (true) {
    const raw = await chQuery(`SELECT canonical_id, symbol, decimals, coingecko_id FROM tokens WHERE is_active = 1 ORDER BY canonical_id LIMIT ${PAGE_SIZE} OFFSET ${offset} FORMAT TabSeparated`);
    const page = parseTSV(raw, ["canonical_id", "symbol", "decimals", "coingecko_id"]);
    if (page.length === 0) break;

    const pipeline = redis.pipeline();
    for (const t of page) {
      if (t.coingecko_id) pipeline.set(`mapping:coingecko:${t.coingecko_id}`, JSON.stringify({ canonical_id: t.canonical_id, symbol: t.symbol || null, decimals: parseInt(t.decimals) || null }));
      pipeline.set(`meta:${t.canonical_id}`, JSON.stringify({ canonicalId: t.canonical_id, symbol: t.symbol || null, decimals: parseInt(t.decimals) || null, coingeckoId: t.coingecko_id || null, blacklisted: false, blacklistedFrom: null }));
    }
    await pipeline.exec();
    totalOps += page.length * 2;
    offset += PAGE_SIZE;
    process.stdout.write(`\r  Tokens: ${offset} processed, ${totalOps} Redis ops`);
    if (page.length < PAGE_SIZE) break;
  }
  console.log();

  // ── Addresses: paginated, push mappings ──
  console.log("Loading addresses...");
  offset = 0;
  while (true) {
    const raw = await chQuery(`SELECT chain, address, canonical_id, symbol, decimals FROM token_addresses WHERE is_active = 1 ORDER BY chain, address LIMIT ${PAGE_SIZE} OFFSET ${offset} FORMAT TabSeparated`);
    const page = parseTSV(raw, ["chain", "address", "canonical_id", "symbol", "decimals"]);
    if (page.length === 0) break;

    const pipeline = redis.pipeline();
    for (const a of page) {
      pipeline.set(`mapping:${a.chain}:${a.address}`, JSON.stringify({ canonical_id: a.canonical_id, symbol: a.symbol || null, decimals: parseInt(a.decimals) || null }));
    }
    await pipeline.exec();
    totalOps += page.length;
    offset += PAGE_SIZE;
    process.stdout.write(`\r  Addresses: ${offset} processed, ${totalOps} Redis ops`);
    if (page.length < PAGE_SIZE) break;
  }
  console.log();

  console.log("Loading latest prices...");
  offset = 0;
  while (true) {
    const raw = await chQuery(`SELECT canonical_id, argMax(price, timestamp) AS price, argMax(confidence, timestamp) AS confidence, argMax(adapter, timestamp) AS adapter, max(timestamp) AS latest_ts FROM coins_prices GROUP BY canonical_id ORDER BY canonical_id LIMIT ${PAGE_SIZE} OFFSET ${offset} FORMAT TabSeparated`);
    const page = parseTSV(raw, ["canonical_id", "price", "confidence", "adapter", "latest_ts"]);
    if (page.length === 0) break;

    const pipeline = redis.pipeline();
    for (const p of page) {
      if (p.price && p.price !== "0") {
        pipeline.set(`price:${p.canonical_id}`, JSON.stringify({ price: p.price, confidence: parseFloat(p.confidence) || null, source: p.adapter || null, timestamp: p.latest_ts || null }), "EX", PRICE_TTL);
      }
    }
    await pipeline.exec();
    totalOps += page.length;
    offset += PAGE_SIZE;
    process.stdout.write(`\r  Prices: ${offset} processed, ${totalOps} Redis ops`);
    if (page.length < PAGE_SIZE) break;
  }
  console.log();

  await redis.set("_bootstrap:ok", Date.now().toString());
  console.log(`Done. Keys: ${await redis.dbsize()}, Memory: ${(await redis.info("memory")).match(/used_memory_human:(.+)/)?.[1]?.trim()}`);
  await redis.quit();
}

main().catch(e => { console.error(e); process.exit(1); });
