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

function convertToMessage(item: Dynamo, topic: Topic): object | undefined {
  const { PK, decimals, price, confidence, SK, adapter, mcap } = item;
  const { pid } = splitPk(PK, decimals);

  switch (topic) {
    case "coins-metadata":
      return; // for coins-metadata, we now rely on getMetadataRecord elsewhere
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

async function produceMetadata(items: Dynamo[], producer: Producer) {
  try {
    await init();
  } catch (initError) {
    console.error("Error initializing coin metadata cache:", initError);
  }

  const metadataMessages: string[] = [];

  items.map((item) => {
    const record = getMetadataRecord(item);
    if (!record) return;
    validate(record, "coins-metadata");
    const msg = JSON.stringify(record);
    if (!metadataMessages.includes(msg)) {
      metadataMessages.push(msg);
    }
  });

  try {
    await producer.send({
      topic: "coins-metadata",
      messages: metadataMessages.map((value) => ({ value })),
    });
    return;
  } catch (error) {
    console.error('Kafka failed for "coins-metadata". Fallback to ES.', error);
  }

  try {
    const body: any[] = [];
    for (const msg of metadataMessages) {
      const doc = JSON.parse(msg);
      body.push({ index: { _index: "coins-metadata", _id: doc.pid } });
      body.push(doc);
    }
    if (body.length) {
      await esClient.bulk({ body });
    }
  } catch (err) {
    console.error("Metadata fallback (bulk to ES) failed:", err);
  }
}

async function produceTopics(items: Dynamo[], topic: Topic, producer: Producer) {
  const messages: string[] = [];

  items.map((item) => {
    const { price, SK } = item;

    if (topic === "coins-timeseries" && SK === 0) return;
    if (topic === "coins-current" && SK !== 0) return;
    if (!price) return;
    const messageObject = convertToMessage(item, topic);
    if (!messageObject) return;
    validate(messageObject, topic);
    const message = JSON.stringify(messageObject);
    if (!messages.includes(message)) {
      messages.push(message);
    }
  });

  try {
    await producer.send({
      topic: `${topic}`,
      messages: messages.map((value) => ({ value })),
    });
    return;
  } catch (error) {
    console.error(`Kafka failed for topic "${topic}". Fallback to ES/Redis.`, error);
  }

  if (topic === "coins-current") {
    try {
      const redisClient = getRedis();
      const pipeline = redisClient.pipeline();
      messages.forEach((msg) => {
        const parsed = JSON.parse(msg);
        pipeline.set(`price_${parsed.pid}`, msg, "EX", 24 * 3600);
      });
      await pipeline.exec();
    } catch (redisError) {
      console.error("Redis fallback failed for coins-current:", redisError);
    }
    try {
      const body: any [] = [];
      messages.forEach((msg) => {
        const parsed = JSON.parse(msg)
        body.push({ index: { _index: "coins-current-backup", _id: parsed.pid }});
        body.push(parsed)
      });
      if (body.length) {
        await esClient.bulk({ body })
      }
    } catch (esError) {
      console.error("ES fallback failed for coins-current:", esError);
    }
  } else if (topic === "coins-timeseries") {
    try {
      const body: any[] = [];
      messages.forEach((msg) => {
        const parsed = JSON.parse(msg);
        const date = new Date(parsed.ts * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const index = `coins-timeseries-${year}-${month}`;

        body.push({ index: { _index: index, _id: `${parsed.pid}_${parsed.ts}` } });
        body.push(parsed);
      });
      if (body.length) {
        await esClient.bulk({ body });
      }
    } catch (esError) {
      console.error("ES fallback failed for coins-timeseries:", esError);
    }
  }
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
    await produceMetadata(items, producer);
    const otherTopics = topics.filter((t) => t !== "coins-metadata");
    await Promise.all(otherTopics.map((topic: Topic) => produceTopics(items, topic, producer)));
  } catch (error) {
    console.error("Error producing messages", error);
  }
}