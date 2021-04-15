import storeTvls from "./storeTvls";
import ddb from "../utils/dynamodb";

describe("storeRates", () => {
  test("works properly", async () => {
    await storeTvls(0, 100);
  });

  test("snapshot db state", async () => {
    Date.now = jest.fn(() => 1487076708000); // 14.02.2017
    await storeTvls(0, 100);
    expect(await ddb.scan()).toMatchSnapshot();
  });
});
