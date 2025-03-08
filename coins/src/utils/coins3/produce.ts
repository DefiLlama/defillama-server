import { Producer } from "kafkajs";
import { Topic, topics as allTopics, validate } from "./jsonValidation";
import { getProducer } from "./kafka";

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
  producer: Producer,
) {
  const messages: string[] = [];

  items.map((item) => {
    const { symbol, decimals, price, SK } = item;
    if (topic != "coins-timeseries" && SK != 0) return;
    if (topic != "coins-metadata" && !price) return;
    if (topic == "coins-metadata" && (!symbol || decimals == null)) return;
    const messageObject: object = convertToMessage(item, topic);
    validate(messageObject, topic);
    const message = JSON.stringify(messageObject);
    if (messages.includes(message)) {
      message;
      return;
    }
    messages.push(message);
  });

  await producer.send({
    topic: `${topic}`,
    messages: messages.map((value) => ({ value })),
  });
}
function convertToMessage(item: Dynamo, topic: Topic): object {
  const {
    PK,
    symbol,
    decimals,
    price,
    confidence,
    SK,
    adapter,
    redirect,
    mcap,
  } = item;

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
        redirects: redirectPid ? [redirectPid]: undefined,
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
  const pid = normalizeCoinId(pk)
  const record: any = { pid }
  if (pid.includes(':')) {
    record.chain = pid.split(':')[0]
    record.address = pid.slice(record.chain.length + 1)
  } else if (pid.length === 42 && pid.startsWith('0x')) {
    record.chain = 'ethereum'
    record.address = pid
  } else if (!decimals && !pid.startsWith('0x')) {
    record.chain = 'coingecko'
  }
  return record
}

export default async function produce(
  items: Dynamo[],
  topics: Topic[] = allTopics,
) {
  try {
    if (!items.length) return;
    const invalidTopic = topics.find((t: any) => {
      !allTopics.includes(t);
    });
    if (invalidTopic) throw new Error(`invalid topic: ${invalidTopic}`);
    const producer: Producer = await getProducer();
    await Promise.all(
      topics.map((topic: Topic) => produceTopics(items, topic, producer)),
    );
  } catch (error) {
    // console.error("Error producing messages", error); // temporarily disabled
  }
}

function normalizeCoinId(coinId: string): string {
  coinId = coinId.toLowerCase()
  const replaceSubStrings = ['asset#', 'coingecko#', 'coingecko:', 'ethereum:']
  const replaceSubStringLengths = replaceSubStrings.map(str => str.length)
  for (let i = 0; i < replaceSubStrings.length; i++) {
    const subStr = replaceSubStrings[i]
    const subStrLength = replaceSubStringLengths[i]
    if (coinId.startsWith(subStr))
      coinId = coinId.slice(subStrLength)

  }
  coinId = coinId.replace(/\//g, ':')
  return coinId
}