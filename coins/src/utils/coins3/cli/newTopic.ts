import { getKafka } from "../kafka";

const createTopic = async () => {
  const kafka = getKafka();
  const admin = kafka.admin();
  await admin.connect();

  // Create a topic
  await admin.createTopics({
    topics: [
      {
        topic: "current", // Replace with your topic name
        numPartitions: 1, // Number of partitions
        replicationFactor: 1, // Replication factor
      },
    ],
  });

  console.log("Topic created successfully");

  // Disconnect the admin client
  await admin.disconnect();
};

createTopic().catch(console.error);
// ts-node coins/src/utils/coins3/cli/newTopic.ts
