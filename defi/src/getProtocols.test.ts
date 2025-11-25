import { getPercentChange } from "./getProtocols";
jest.mock("./protocols/data");

test("getPercentChange", () => {
  expect(getPercentChange(10, 20)).toBe(100);
  expect(getPercentChange(0, 20)).toBe(100);
  expect(getPercentChange(10, 10)).toBe(0);
  expect(getPercentChange(10, 0)).toBe(-100);
  expect(getPercentChange(10, 5)).toBe(-50);
  expect(getPercentChange(20, 2)).toBe(-90);
  expect(getPercentChange(10, 50)).toBe(400);
});
