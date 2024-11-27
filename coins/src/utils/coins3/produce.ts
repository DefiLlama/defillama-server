import { Message, Producer } from "kafkajs";
import { Topic, topics as allTopics, validate } from "./jsonValidation";
import { getProducer } from "./kafka";

type Dynamo = {
  SK: number;
  PK: string;
  adapter: string;
  confidence: number;
  price: number;
  redirect?: string;
  decimals?: number;
  symbol?: string;
  timestamp?: number;
};

async function produceTopics(
  items: Dynamo[],
  topic: Topic,
  producer: Producer,
) {
  const messages: Message[] = [];

  items.map((item) => {
    const { symbol, decimals } = item;
    if (!symbol || decimals == null) return;
    const message: object = convertToMessage(item, topic);
    validate(message, topic);
    messages.push({ value: JSON.stringify(message) });
  });

  await producer.send({ topic: `${topic}`, messages });
}
function convertToMessage(item: Dynamo, topic: Topic): object {
  const { PK, symbol, decimals, price, confidence, timestamp, adapter } = item;
  const { chain, address, pid } = splitPk(PK);

  switch (topic) {
    case "metadata":
      return { symbol, decimals, address, pid, chain, source: adapter };
    case "current":
      return { pid, price, confidence, source: adapter };
    case "timeseries":
      return { pid, price, confidence, source: adapter, ts: timestamp };
    default:
      throw new Error(`Topic '${topic}' is not valid`);
  }
}
function splitPk(pk: string): { chain: string; address: string; pid: string } {
  const assetPrefix: string = "asset#";
  const coingeckoPrefix: string = "coingecko#";

  if (pk.toLowerCase().startsWith(coingeckoPrefix)) {
    const address = pk.substring(coingeckoPrefix.length).toLowerCase();
    return {
      chain: "coingecko",
      address,
      pid: `coingecko:${address}`,
    };
  }

  if (pk.startsWith(assetPrefix)) pk = pk.substring(assetPrefix.length);
  const chain = pk.split(":")[0].toLowerCase();
  const address = pk.substring(pk.split(":")[0].length + 1).toLowerCase();
  return { chain, address, pid: `${chain}:${address}` };
}

export default async function produce(
  items: Dynamo[],
  topics: string[] = allTopics,
) {
  const producer: Producer = await getProducer();
  await Promise.all(
    topics.map((topic: Topic) => produceTopics(items, topic, producer)),
  );
}
