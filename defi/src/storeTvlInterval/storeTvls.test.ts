import storeTvls from "./storeTvls";
import ddb from "../utils/dynamodb";

describe("storeRates", () => {
  test("works properly", async () => {
    await storeTvls(Array.from(Array(100).keys()));
  });

  test("snapshot db state", async () => {
    Date.now = jest.fn(() => 1487076708000); // 14.02.2017
    await storeTvls(Array.from(Array(100).keys()));
    expect(await ddb.scan()).toMatchSnapshot();
  });
});
