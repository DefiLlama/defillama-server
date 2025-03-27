import { Consumer, Kafka, Producer } from "kafkajs";

let kafka: Kafka;
let producer: Producer;
const consumers: { [groupId: string]: Consumer } = {};

export function getKafka(): Kafka {
  if (!kafka) {
    const kafkaConfig = process.env.KAFKA_CLIENT_CONFIG;
    if (!kafkaConfig) {
      throw new Error("Missing KAFKA_CLIENT_CONFIG");
    }
    const [brokers, username, password] = kafkaConfig.split("---");
    kafka = new Kafka({
      clientId: "my-app",
      brokers: brokers.split(","),
      ssl: {
        rejectUnauthorized: false,
      },
      sasl: { mechanism: "scram-sha-256", username, password },
    });
  }
  return kafka;
}

export async function getConsumer(groupId: any): Promise<Consumer> {
  if (!groupId) throw new Error("Missing groupId");
  if (!consumers[groupId])
    consumers[groupId] = getKafka().consumer({ groupId });
  await consumers[groupId].connect();
  return consumers[groupId];
}

export async function getProducer(): Promise<Producer> {
  if (!producer) producer = getKafka().producer();
  await producer.connect();
  return producer;
}