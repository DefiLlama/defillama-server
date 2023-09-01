import { startup, windDown } from "../../coins2";
import {
  batchWrite2WithAlerts,
  batchWriteWithAlerts,
} from "../adapters/utils/database";
import { getCurrentUnixTimestamp } from "../utils/date";

export default async function test() {
  startup();
  try {
    const result = [
      {
        PK: "runner.test",
        SK: getCurrentUnixTimestamp(),
        price: 0,
        timestamp: 0,
        Symbol: "",
        confidence: 0,
      },
      {
        PK: "runner.test",
        SK: 0,
        price: 0,
        timestamp: 0,
        Symbol: "",
        confidence: 0,
      },
    ];

    await Promise.all([
      batchWriteWithAlerts(result, true),
      batchWrite2WithAlerts(result),
    ]);
    console.log(`test runner done`);
  } catch (e) {
    console.error(`test runner failed  ${e}`);
  }
  await windDown();
  console.log("connections closed");
  process.exit(0);
}
test();
