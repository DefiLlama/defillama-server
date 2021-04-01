import { errorResponse } from "./lambda-response";

test("errorResponse works with both field and without", () => {
  expect(errorResponse({ message: "supp", field: "email" }))
    .toMatchInlineSnapshot(`
    Object {
      "body": "{\\"message\\":\\"supp\\",\\"field\\":\\"email\\"}",
      "headers": Object {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      "statusCode": 400,
    }
  `);
  expect(errorResponse({ message: "supp" })).toMatchInlineSnapshot(`
    Object {
      "body": "{\\"message\\":\\"supp\\"}",
      "headers": Object {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      "statusCode": 400,
    }
  `);
  expect(errorResponse({ message: "supp", field: undefined }).body).toEqual(
    JSON.stringify({
      message: "supp",
    })
  );
});
