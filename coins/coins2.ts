import { Redis } from "ioredis";

export type Coin = {
  price: number;
  timestamp: number;
  key: string;
  chain: string;
  adapter: string;
  confidence: number;
  decimals?: number;
  symbol: string;
  mcap?: number | null;
};

let auth: string[];

async function generateAuth() {
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there arent 3 auth params");
}
let _redis: Redis;

export async function getRedisConnection() {
  if (_redis) return _redis;
  // _redis is a promise that resolves to a redis connection because we want to wait for the auth to be generated
  (_redis as any) = new Promise(async (resolve, reject) => {
    try {
      if (!auth) await generateAuth();
      _redis = new Redis({
        port: 6379,
        host: auth[1],
        password: auth[2],
        connectTimeout: 10000,
      });
      resolve(_redis);
    } catch (e) {
      reject(e);
    }
  });
  return _redis;
}

process.on("exit", async () => {
  if (_redis) {
    const redis = await _redis;
    redis.quit();
  }
});
