import { ecosystem } from "./developers/npm";
import { npmPK } from "./developers/utils";
import { successResponse, wrap, IResponse } from "./utils/shared";
import dynamodb from "./utils/shared/dynamodb";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const start = event.pathParameters!.start
  const packages = await Promise.all(Object.entries(ecosystem).map(([eco, pkgs])=>pkgs.map(pkg=>({eco, pkg}))).flat().map(async ({eco, pkg})=>{
    const data = await dynamodb.query({
        ExpressionAttributeValues: {
          ":pk": npmPK(pkg),
          ":begin": start,
        },
        KeyConditionExpression: "PK = :pk AND SK > :begin"
      })
    return ({
        eco,
        pkg,
        downloads: data.Items!.map(({SK, downloads})=>[SK, downloads])
    })
  }))
  return successResponse(packages, 30*60);
};

export default wrap(handler);
