import { getErrorDBConnection } from "./utils/shared/getDBConnection";
import { getCurrentUnixTimestamp } from "./utils/date";
import { sendMessage } from "./utils/discord";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import { sluggifyString } from "./utils/sluggify";

// CREATE TABLE errorReports (time INT, protocol VARCHAR(200), dataType VARCHAR(200), message TEXT, correctSource TEXT, contact TEXT, id serial primary key);

export async function reportError({ message, protocol, dataType, correctSource, contact }: any) {
  await getErrorDBConnection()`
  insert into errorReports (
    time, protocol, dataType, message, correctSource, contact
  ) values (
    ${getCurrentUnixTimestamp()}, ${protocol}, ${dataType}, ${message}, ${correctSource}, ${contact}
  )`
    await sendMessage(
      `Protocol: ${protocol}
Data: ${dataType}
What's wrong: ${message}
Correct data: ${correctSource}
Contact: ${contact ?? '-'}
<https://defillama.com/protocol/${sluggifyString(protocol)}>`, process.env.ERROR_REPORTS_WEBHOOK, false).catch(e => console.log(`Failed to send a discord message for ${protocol} (${dataType})`, e))

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
