import { getErrorDBConnection } from "./utils/shared/getDBConnection";
import { getCurrentUnixTimestamp } from "./utils/date";
import { sendMessage } from "./utils/discord";
import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import { sluggifyString } from "./utils/sluggify";

// CREATE TABLE errorReports (time INT, protocol VARCHAR(200), dataType VARCHAR(200), message TEXT, correctSource TEXT, contact TEXT, id serial primary key);

export async function reportError({ message, protocol, dataType, correctSource, contact }: any) {
  const formattedMessage = `Protocol: ${protocol}
Data: ${dataType}
What's wrong: ${message}
Correct data: ${correctSource}
https://defillama.com/protocol/${sluggifyString(protocol)}`

await sendMessage(formattedMessage, process.env.ERROR_REPORTS_WEBHOOK, false)
    .catch(e => console.log(`Failed to send a discord message for ${protocol} (${dataType})`, e))

  const formData = new FormData();
  formData.append('name', `${protocol} (${dataType})`);
  formData.append('email', contact ?? `anon@defillama.com`);
  formData.append('body', formattedMessage);
  
  await getErrorDBConnection()`
  insert into errorReports (
    time, protocol, dataType, message, correctSource, contact
  ) values (
    ${getCurrentUnixTimestamp()}, ${protocol}, ${dataType ?? null}, ${message ?? null}, ${correctSource ?? null}, ${contact ?? null}
  )`

  const frontResponse = await fetch(`https://webhook.frontapp.com/forms/0f7e04ca1380d461a597/LKbySkFsuoKOT3u3tAzk45SYm8cWIPVJb2zipokH6m-bzllqmtpfU_X7vmTO4rSaEzyqaVIB04K-TMAmXLFd7SDvKyDyUm1-zkjkycK6KPhEe4fZaa9q2KK95l-Ju8A`, {
      method: 'POST',
      headers: {
        Referer: 'https://defillama.com/error',
        Origin: 'https://defillama.com',
      },
      body: formData
  })
  
  if(frontResponse.url !== "https://defillama.com/error?code=ok") {
    throw new Error(`Failed to send a front message for ${protocol} (${dataType})`)
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
