import { topics } from "../jsonValidation";
import { getConsumer } from "../kafka";

const run = async () => {
  await Promise.all(
    topics.map(async (topic) => {
      const consumer = await getConsumer(topic);
      await consumer.subscribe({ topic, fromBeginning: true });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }: any) => {
          console.log({
            topic,
            partition,
            offset: message.offset,
            value: message.value.toString(),
          });
        },
      });
    }),
  );
};

run().catch(console.error);
// ts-node coins/src/utils/coins3/cli/consume.ts
