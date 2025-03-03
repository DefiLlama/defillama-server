import { Producer } from "kafkajs";
import { esClient, getMetadataRecord, init } from "./es";
import { Topic, topics as allTopics, validate } from "./jsonValidation";
import { getProducer } from "./kafka";
import { getRedis } from "./redis";
import { normalizeCoinId } from "./utils";

export type Dynamo = {
  SK: number;
  PK: string;
  adapter: string;
  confidence: number;
  price: number;
  redirect?: string;
  decimals?: number;
  symbol?: string;
  timestamp?: number;
  mcap?: number;
};

async function produceTopics(
  items: Dynamo[],
  topic: Topic,
  producer: Producer
) {
  const messages: string[] = [];

  items.map((item) => {
    const { symbol, decimals, price, SK } = item;
    if (topic !== "coins-timeseries" && SK !== 0) return;
    if (topic !== "coins-metadata" && !price) return;
    if (topic === "coins-metadata" && (!symbol || decimals == null)) return;

    const messageObject = convertToMessage(item, topic);
    validate(messageObject, topic);

    const message = JSON.stringify(messageObject);
    if (!messages.includes(message)) {
      messages.push(message);
    }
  });

  if (!messages.length) return;

  if (process.env.KAFKA_UP === 'true') {
    try {
      await producer.send({
        topic: `${topic}`,
        messages: messages.map((value) => ({ value })),
      });
      return;
    } catch (error) {
      console.error(`Kafka failed for topic "${topic}". Fallback to ES/Redis.`, error);
    }
  }

  for (const msg of messages) {
    const parsed = JSON.parse(msg);

    if (topic === "coins-current") {
      const redisClient = getRedis();
      const redisKey = `price_${parsed.pid}`;
      await redisClient.set(redisKey, msg, "EX", 24 * 3600);
    } else if (topic === "coins-metadata") {
      await init();
      const esRecord = getMetadataRecord(parsed);
      if (!esRecord) continue;
      await esClient.index({
        index: "coins-metadata",
        body: esRecord,
      });
    } else if (topic === "coins-timeseries") {
      const date = new Date(parsed.ts * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const index = `coins-timeseries-${year}-${month}`;
      await esClient.index({
        index,
        id: `${parsed.pid}_${parsed.ts}`,
        body: parsed,
      });
    }
  }
}

function convertToMessage(item: Dynamo, topic: Topic): object {
  const { PK, symbol, decimals, price, confidence, SK, adapter, redirect, mcap } = item;
  const { chain, address, pid } = splitPk(PK, decimals);
  const redirectPid = redirect ? splitPk(redirect).pid : undefined;

  switch (topic) {
    case "coins-metadata":
      return {
        symbol,
        decimals: decimals ? Number(decimals) : 0,
        address,
        pid,
        chain,
        adapter,
        redirects: redirectPid ? [redirectPid] : undefined,
      };
    case "coins-current":
      return { pid, price, confidence, adapter, mcap, updateTs: Math.floor(Date.now() / 1000) };
    case "coins-timeseries":
      return { pid, price, confidence, adapter, ts: SK, mcap };
    default:
      throw new Error(`Topic '${topic}' is not valid`);
  }
}

function splitPk(pk: string, decimals?: number): { chain?: string; address?: string; pid: string } {
  const pid = normalizeCoinId(pk);
  const record: any = { pid };
  if (pid.includes(":")) {
    record.chain = pid.split(":")[0];
    record.address = pid.slice(record.chain.length + 1);
  } else if (pid.length === 42 && pid.startsWith("0x")) {
    record.chain = "ethereum";
    record.address = pid;
  } else if (!decimals && !pid.startsWith("0x")) {
    record.chain = "coingecko";
  }
  return record;
}

export default async function produce(
  items: Dynamo[],
  topics: Topic[] = allTopics
) {
  try {
    if (!items.length) return;
    const invalidTopic = topics.find((t: any) => !allTopics.includes(t));
    if (invalidTopic) throw new Error(`invalid topic: ${invalidTopic}`);

    const producer: Producer = await getProducer();
    await Promise.all(
      topics.map((topic: Topic) => produceTopics(items, topic, producer))
    );
  } catch (error) {
    // console.error("Error producing messages", error);
  }
}