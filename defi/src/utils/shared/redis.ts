import { createClient, RedisClientType } from 'redis';

const URL = process.env.COMMON_REDIS_CACHE || 'redis://127.0.0.1:6379';

const client: RedisClientType = createClient({
  url: URL,
});

client.on('error', (err) => {
  console.log('Redis Client Error', err);
});

interface RedisOperationOptions {
  throwErrorWhenFailed?: boolean;
}

export async function setJSON(key: string, data: any, options: RedisOperationOptions) {
  try {
    await startConnection();
    await client.set(key, JSON.stringify(data));
  } catch (e: any) {
    if (options.throwErrorWhenFailed) {
      throw e;
    }
  }
}

export async function getJSON(key: string, options: RedisOperationOptions): Promise<any> {
  try {
    await startConnection();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (e: any) {
    if (options.throwErrorWhenFailed) {
      throw e;
    }
    return null;
  }
}

let connectPromise: Promise<void> | null = null;

async function startConnection() {
  if (client.isOpen) return;
  if (!connectPromise) {
    connectPromise = client.connect().then(() => {
      connectPromise = null;
    }, (err) => {
      connectPromise = null;
      throw err;
    });
  }
  await connectPromise;
}

async function closeConnection() {
  console.log("Closing Redis cache connection");
  await client.close();
}

process.on("exit", closeConnection);
process.on("SIGINT", closeConnection);
process.on("SIGTERM", closeConnection);
