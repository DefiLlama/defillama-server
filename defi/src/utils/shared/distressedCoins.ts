import { getUnixTimeNow } from "../../api2/utils/time";
import { chainsThatShouldNotBeLowerCased } from "../../utils/shared/constants";
import { elastic, cache } from "@defillama/sdk";

function sanitizeKey(key: string) {
  const chain = key.split(":")[0];
  const address = key.substring(chain.length + 1);
  const normalizedAddress = chainsThatShouldNotBeLowerCased.includes(chain) ? address : address.toLowerCase();
  return `${chain}:${normalizedAddress}`;
}

export async function isDistressed(key: string, client?: any) {
  if (!client) client = elastic.getClient();

  const _id = sanitizeKey(key)
  const { hits } = await client.search({
    index: "distressed-assets-store*",
    body: {
      query: {
        match: { _id },
      },
    },
  });

  return hits?.hits?.length > 0;
}

export async function addToDistressed(keys: string[], client?: any) {
  if (!client) client = elastic.getClient();

  const body: any[] = [];
  keys.map((key: string) => {
    const _id = sanitizeKey(key)
    body.push({ index: { _index: "distressed-assets-store", _id } });
  });

  await client.bulk({ body });
}

export async function logDistressedCoins(keys: string[], protocol: string) {
  await elastic.writeLog("distressed-assets", { keys, protocol, reportTime: getUnixTimeNow() });
}

export async function readDistressedLogs() {
  const esClient = elastic.getClient();
  const hourAgo = Math.floor(Date.now() / 1000) - 3600;
  let { lastCheckTS } = (await cache.readExpiringJsonCache("distressed-assets-last-check")) || { lastCheckTS: 0 };
  if (!lastCheckTS || lastCheckTS < hourAgo) lastCheckTS = hourAgo - 1;

  let {
    hits: { hits },
  }: any = await esClient?.search({
    index: "distressed-assets*",
    size: 9999,
    body: {
      query: {
        range: {
          // find records with reportTime > lastCheckTS
          reportTime: {
            gt: lastCheckTS, // reportTime is in ms
          },
        },
      },
    },
  });

  if (!hits?.length) return;

  const newDistressedCoins: string[] = [];
  hits.map(({ _source: { keys } }: any) => {
    newDistressedCoins.push(...keys);
  });

  await addToDistressed(newDistressedCoins, esClient);

  const timeNow = Math.floor(Date.now() / 1000);

  await cache.writeExpiringJsonCache(
    "distressed-assets-last-check",
    { lastCheckTS: timeNow },
    { expireAfter: 7 * 24 * 3600 }
  );
}