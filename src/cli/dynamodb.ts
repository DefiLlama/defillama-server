import AWS from 'aws-sdk';

AWS.config.update({region: 'eu-central-1'});
export const client = new AWS.DynamoDB.DocumentClient();

const ts = (date:string)=>Math.round(new Date(date).getTime()/1000)
const step = 25
export const hourlyPrefix = 'hourlyTvl'
export const dailyPrefix = 'dailyTvl'

export const dynamoPrefix = dailyPrefix;
export const TableName = "prod-table"
export const maxProtocolId = 300