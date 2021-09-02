import { successResponse, wrap, IResponse } from "./utils";
import ddb from "./utils/dynamodb";
import collections from "./nfts/collections"
import { getLastRecord } from "./utils/getLastRecord";

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const collectionData = (await Promise.all(collections.map(async col=>{
      const item = await getLastRecord(`nfts#${col.id}`)
      if(item === undefined){
          return null
      }
      delete item['PK']
      delete item['SK']

      return {
          ...col,
          ...item
      }
  }))).filter(item=>item!==null)
  return successResponse({
      collections: collectionData
  }, 10 * 60);
};

export default wrap(handler);
