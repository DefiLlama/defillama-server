import { getErrorDBConnection } from "./utils/shared/getDBConnection";
import { getCurrentUnixTimestamp } from "./utils/date";
import { sendMessage } from "./utils/discord";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import { sluggifyString } from "./utils/sluggify";
import fetch from "node-fetch";

// CREATE TABLE errorReports (time INT, protocol VARCHAR(200), dataType VARCHAR(200), message TEXT, correctSource TEXT, contact TEXT, id serial primary key);

export async function reportError({ message, protocol, dataType, correctSource, contact }: any) {
  const formattedMessage = `Protocol: ${protocol}
Data: ${dataType}
What's wrong: ${message}
Correct data: ${correctSource}
https://defillama.com/protocol/${sluggifyString(protocol)}`

  const frontResponse = await fetch(`https://defillama.api.frontapp.com/channels/cha_kj4ps/incoming_messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FRONT_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        handle: contact ?? `Anon ${Math.round(Math.random()*1e5)}`,
      },
      subject: `Report: ${protocol} (${dataType})`,
      body: formattedMessage,
    }),
  }).then(res => res.json());
  
  await getErrorDBConnection()`
  insert into errorReports (
    time, protocol, dataType, message, correctSource, contact
  ) values (
    ${getCurrentUnixTimestamp()}, ${protocol}, ${dataType ?? null}, ${message ?? null}, ${correctSource ?? null}, ${contact ?? null}
  )`
    await sendMessage(message, process.env.ERROR_REPORTS_WEBHOOK, false)
    .catch(e => console.log(`Failed to send a discord message for ${protocol} (${dataType})`, e))

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
