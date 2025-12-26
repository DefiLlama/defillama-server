import { Lambda } from "@aws-sdk/client-lambda"
let lambdaClient: Lambda | null = null

export default async function invokeLambda(functionName: string, event: any) {
  if (!lambdaClient)
    lambdaClient = new Lambda()
  return lambdaClient.invoke({
    FunctionName: functionName,
    InvocationType: "Event",
    Payload: JSON.stringify(event, null, 2), // pass params
  }).then((res) => {
    console.log(`Invoked lambda ${functionName}`, res.StatusCode);
    return res;
  }).catch((e) => {
    console.error(`Error invoking lambda ${functionName}`, e);
  });
}
