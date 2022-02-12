import aws from "aws-sdk";

export default async function invokeLambda(functioName: string, event: any) {
  return new Promise((resolve, _reject) => {
    new aws.Lambda().invoke(
      {
        FunctionName: functioName,
        InvocationType: "Event",
        Payload: JSON.stringify(event, null, 2), // pass params
      },
      function (error, data) {
        console.log(error, data);
        resolve(data);
      }
    );
  });
}
