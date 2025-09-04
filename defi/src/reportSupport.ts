import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";

export async function reportError(body: any, contentType: string) {
  const frontResponse = await fetch(`https://webhook.frontapp.com/forms/0f7e04ca1380d461a597/uky4NCniM0Y8XgxBu5OonIta1t4x7FK9rHRUohY5m2-Ae170F0Wxjj-AwWzBoPEJCcOiCTGqMG-vQ1C1iEYyg6vcqMsz9hrfUQE1qfFGh01dk0A1hG_tf3RWez5gvKY`, {
      method: 'POST',
      headers: {
        Referer: 'https://defillama.com/support',
        Origin: 'https://defillama.com',
        "Content-Type": contentType
      },
      body: body
  })
  
  if(frontResponse.url !== "https://defillama.com/support?code=ok") {
    throw new Error(`Failed to send a front message`)
  }
}

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  try {
    await reportError(event.body, event.headers['content-type']!);
    return successResponse({ message: "success" });
  } catch (e) {
    console.log(e);
    return errorResponse({ message: "Something went wrong." });
  }
};

export default wrap(handler);
