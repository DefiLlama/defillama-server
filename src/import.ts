import dynamodb from "./utils/dynamodb";
import protocols, { Protocol } from "./protocols/data";
import { successResponse } from "./utils";
import { getTimestampAtStartOfDay } from "./utils/date";
import axios from "axios";

export default async (event: AWSLambda.APIGatewayEvent) => {
  const id = Number(event.pathParameters?.id);
  const protocol = protocols[id];
  console.log(protocol.name);
  const protocolData = await axios.get(
    `https://api.defillama.com/protocol/${protocol.name
      .toLowerCase()
      .replace(" ", "-")}`
  );
  const historicalTvls = protocolData.data.tvl;
  await Promise.all(
    historicalTvls.map(async (item: any) => {
      const date = Number(item.date);
      const totalLiquidityUSD = Number(item.totalLiquidityUSD);
      console.log(date, totalLiquidityUSD);
      return;
      await dynamodb.put({
        PK: `dailyTvl#${protocol.id}`,
        SK: date,
        tvl: totalLiquidityUSD,
      });
      await dynamodb.put({
        PK: `hourlyTvl#${protocol.id}`,
        SK: date,
        tvl: totalLiquidityUSD,
        tvlPrev1Hour: 0,
        tvlPrev1Day: 0,
        tvlPrev1Week: 0,
      });
    })
  );
  return successResponse({
    done: true,
    protocok: protocol.name,
  });
};
