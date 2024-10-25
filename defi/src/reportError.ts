import { getErrorDBConnection } from "./getDBConnection";
import { getCurrentUnixTimestamp } from "./utils/date";
import { sendMessage } from "./utils/discord";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import { sluggifyString } from "./utils/sluggify";

// CREATE TABLE errorReports (time INT, protocol VARCHAR(200), dataType VARCHAR(200), message TEXT, correctSource TEXT, id serial primary key);

export async function reportError({ message, protocol, dataType, correctSource }: any) {

  const previousErrors = await getErrorDBConnection()`select protocol, dataType from errorReports where time > ${getCurrentUnixTimestamp() - 24 * 3600} and protocol = ${protocol} and dataType = ${dataType}`
  await getErrorDBConnection()`
  insert into errorReports (
    time, protocol, dataType, message, correctSource
  ) values (
    ${getCurrentUnixTimestamp()}, ${protocol}, ${dataType}, ${message}, ${correctSource}
  )`
  if (previousErrors.length === 0) {
    await sendMessage(
      `Protocol: ${protocol}
Data: ${dataType}
What's wrong: ${message}
Correct data: ${correctSource}
<https://defillama.com/protocol/${sluggifyString(protocol)}>`, process.env.ERROR_REPORTS_WEBHOOK, false).catch(e => console.log(`Failed to send a discord message for ${protocol} (${dataType})`, e))
  }

}
const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  try {
    const body = JSON.parse(event.body!);
    await reportError(body);
    return successResponse({ message: "success" });
  } catch (e) {
    console.log(e);
    return errorResponse({ message: "Something went wrong." });
  }
};

export default wrap(handler);
