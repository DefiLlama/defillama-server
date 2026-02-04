import Redis, { Redis as RedisClient } from "ioredis";

let redisClient: RedisClient;

export function getRedis(): RedisClient  {
  if (!redisClient) {
    const redisConfig = process.env.REDIS_CLIENT_CONFIG;
    if (!redisConfig) {
      throw new Error("Missing REDIS_CLIENT_CONFIG");
    }
    const [host, port, password] = redisConfig.split("---");
    redisClient = new Redis({
      host,
      port: Number(port),
      password
    });
  }

  return redisClient;
}