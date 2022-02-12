import dynamodb from "./shared/dynamodb";

export function getLastRecord(PK: string) {
  return dynamodb
    .query({
      ExpressionAttributeValues: {
        ":pk": PK,
      },
      KeyConditionExpression: "PK = :pk",
      Limit: 1,
      ScanIndexForward: false,
    })
    .then((res) => res.Items?.[0]);
}

export const hourlyTvl = (protocolId: string) => `hourlyTvl#${protocolId}`;
export const hourlyTokensTvl = (protocolId: string) =>
  `hourlyTokensTvl#${protocolId}`;
export const hourlyUsdTokensTvl = (protocolId: string) =>
  `hourlyUsdTokensTvl#${protocolId}`;
export const hourlyRawTokensTvl = (protocolId: string) =>
  `hourlyRawTokensTvl#${protocolId}`;
export const dailyTvl = (protocolId: string) => `dailyTvl#${protocolId}`;
export const dailyTokensTvl = (protocolId: string) =>
  `dailyTokensTvl#${protocolId}`;
export const dailyUsdTokensTvl = (protocolId: string) =>
  `dailyUsdTokensTvl#${protocolId}`;
export const dailyRawTokensTvl = (protocolId: string) =>
  `dailyRawTokensTvl#${protocolId}`;
