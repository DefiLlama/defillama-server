import { createClient, RedisClientType } from 'redis';

const URL = process.env.REDIS_CACHE || 'redis://127.0.0.1:6379';

const client: RedisClientType = createClient({
  url: URL,
});

client.on('error', (err) => {
  console.log('Redis Client Error', err);
});

export async function setJSON(key: string, data: any) {
  await startConnection();
  await client.set(key, JSON.stringify(data));
}

export async function getJSON(key: string): Promise<any> {
  await startConnection();
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
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
