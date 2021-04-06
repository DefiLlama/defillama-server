const AWS =require('aws-sdk');
const db = require('../imported-db/defillama-db.json');

AWS.config.update({region: 'eu-central-1'});
const client = new AWS.DynamoDB.DocumentClient();

const hourly = db[4].data;
const daily=db[5].data;
const ts = (date)=>Math.round(new Date(date).getTime()/1000)
const step = 25
const table = daily;
const dynamoPrefix = 'dailyTvl';
const TableName = "dev-table"

const importOld = async ()=>{
  for(let i=0; i<table.length; i+=step){
    const items = [];
    table.slice(i, i+step).forEach((item, j)=>{
      const processed = {
        PutRequest:{
          Item:{
              PK:`${dynamoPrefix}#${item.pid}`,
              SK: ts(item.ts),
              tvl: Number(item.TVL)
          }
        }
      }
      if(items.some(it=>it.PutRequest.Item.PK === processed.PutRequest.Item.PK &&
         it.PutRequest.Item.SK === processed.PutRequest.Item.SK)){
        console.log('udplicate', processed)
        return // duplicate
      }
      items.push(processed)
  })
    console.log(JSON.stringify(items))
    await client.batchWrite({
      RequestItems:{
        [TableName]: items
      }
    }).promise();
  }
}

function getClosestDayStartTimestamp(timestamp) {
  const dt = new Date(timestamp * 1000);
  dt.setHours(0, 0, 0, 0);
  const prevDayTimestamp = Math.floor(dt.getTime() / 1000);
  dt.setHours(24);
  const nextDayTimestamp = Math.floor(dt.getTime() / 1000);
  if (
    Math.abs(prevDayTimestamp - timestamp) <
    Math.abs(nextDayTimestamp - timestamp)
  ) {
    return prevDayTimestamp;
  } else {
    return nextDayTimestamp;
  }
}

const deleteOverlapping = async ()=>{
  for(const item of table){
    const SK = ts(item.ts);
    const newSK = getClosestDayStartTimestamp(SK);
    const tvl = Number(item.TVL)
    const PK = `${dynamoPrefix}#${item.pid}`;
    console.log('delete', PK, SK)
      await client.delete({
        TableName,
        Key:{
          PK,
          SK
        }
      }).promise()
      await client.put({
        TableName,
        Item:{
          PK,
          SK:newSK,
          tvl
        }
      }).promise()
  }
}

deleteOverlapping();