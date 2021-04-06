import dynamodb from "./dynamodb";

export default function(protocolId:string){
    return dynamodb.query({
        ExpressionAttributeValues: {
          ":pk": `hourlyTvl#${protocolId}`,
        },
        KeyConditionExpression: "PK = :pk",
        Limit: 1,
        ScanIndexForward: false,
      });
}