import { wrapScheduledLambda } from "./utils/wrap";
import fetch from 'node-fetch'
import aws from 'aws-sdk';

const step = 500;
const handler = async () => {
  const coins = await fetch('https://api.coingecko.com/api/v3/coins/list').then(r => r.json())
  const lambda = new aws.Lambda();
  for (let i = 0; i < coins.length; i += step) {
    const event = {
      coins: coins.slice(i, i + step),
      depth: 0
    }
    await new Promise((resolve, _reject) => {
      lambda.invoke({
        FunctionName: `defillama-prod-fetchCoingeckoData`,
        InvocationType: 'Event',
        Payload: JSON.stringify(event, null, 2) // pass params
      }, function (error, data) {
        if (error) {
          console.error('error', error);
        }
        console.log(data)
        resolve(data)
      });
    })
  }
};

export default wrapScheduledLambda(handler);
