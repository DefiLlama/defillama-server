import parseRequestBody from "./parseRequestBody";

test("invalid json body is rejected", () => {
  expect(() => {
    parseRequestBody("fake");
  }).toThrowErrorMatchingInlineSnapshot(
    `"Message body is not a valid JSON object"`
  );
});

test("parsed JSON object is returned", () => {
  expect(parseRequestBody('{"a":"b"}')).toEqual({
    a: "b",
  });
});
