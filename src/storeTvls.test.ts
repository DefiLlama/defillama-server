import storeTvls from "./storeTvls";
import ddb from "./utils/dynamodb";

/*
function getItem(crypto: string, itemName: string) {
  return ddb.get({
    Key: {
      PK: `rates#${crypto}`,
      SK: `item#${itemName}`,
    },
  });
}

function queryItems(crypto: string) {
  return ddb.query({
    ExpressionAttributeValues: {
      ":pk": `rates#${crypto}`,
    },
    KeyConditionExpression: "PK = :pk",
  });
}
*/

describe("storeRates", () => {
  test("works properly", async () => {
    await storeTvls();
  });

  test("snapshot db state", async () => {
    Date.now = jest.fn(() => 1487076708000); // 14.02.2017
    await storeTvls();
    expect(await ddb.scan()).toMatchSnapshot();
  });
});
