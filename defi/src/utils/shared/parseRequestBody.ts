export default function (rawBody: null | string): any {
  if (rawBody === null) {
    throw new Error("No message body was provided");
  }
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    throw new Error("Message body is not a valid JSON object");
  }
  return body;
}
