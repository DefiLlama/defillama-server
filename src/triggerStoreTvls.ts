import { wrapScheduledLambda } from "./utils/wrap";
import protocols from './protocols/data'
import aws from 'aws-sdk';

const step = 15;
const handler = async () => {
  const lambda = new aws.Lambda();
  for (let i = 0; i < protocols.length; i += step) {
    const event = {
      first: i,
      last: i + step
    }
    lambda.invoke({
      FunctionName: `defillama-${process.env.stage}-storeTvlInterval`,
      InvocationType: 'Event',
      Payload: JSON.stringify(event, null, 2) // pass params
    }, function (error, _data) {
      if (error) {
        console.error('error', error);
      }
    });
  }
};

export default wrapScheduledLambda(handler);
