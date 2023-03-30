import { AdaptorRecordType } from "./adaptor-record";

const isArrayUnique = (arr: any[]) => Array.isArray(arr) && new Set(arr).size === arr.length;
test("No duplicated adapter type", async () => {
    const values = Object.values(AdaptorRecordType)
    expect(isArrayUnique(values)).toBeTruthy();
});