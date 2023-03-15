import { successResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import ddb from "./utils/shared/dynamodb";
import { getProvider } from "@defillama/sdk/build/general"
import fetch from "node-fetch"
import { getCurrentUnixTimestamp } from "./utils/date";

interface TimestampBlock {
  height: number;
  timestamp: number;
}

function cosmosBlockProvider(chain: "terra" | "kava") {
  return {
    getBlock: async (height: number | "latest") =>
      fetch(`${chain === "kava" ? "https://api.data.kava.io/blocks/" : "https://lcd.terra.dev/blocks/"}${height}`)
        .then((res) => res.json())
        .then((block) => ({
          number: Number(block.block.header.height),
          timestamp: Math.round(Date.parse(block.block.header.time) / 1000),
        })),
  };
}

const blockPK = (chain: string) => `block#${chain}`

async function getBlock(provider: ReturnType<typeof cosmosBlockProvider>, height: number | "latest", chain: string): Promise<TimestampBlock> {
  const block = await provider.getBlock(height)
  if (block === null) {
    throw new Error(`Can't get block of chain ${chain} at height "${height}"`)
  }
  await ddb.put({
    PK: blockPK(chain),
    SK: block.timestamp,
    height: block.number,
  })
  return {
    height: block.number,
    timestamp: block.timestamp
  }
}

function getExtraProvider(chain: string | undefined) {
  if (chain === "terra" || chain === "kava") {
    return cosmosBlockProvider(chain)
  }
  return getProvider(chain as any);
}

async function isAValidBlockAtThisTimestamp(timestamp: number, provider: any) {
  try {
    const genesisBlockTime = await provider.getBlock(1).then((b: any) => b.timestamp)
    return genesisBlockTime < timestamp && timestamp < Date.now() / 1000;
  } catch {
    return true;
  }
}

function getClosestBlock(PK: string, timestamp: number, search: "high" | "low") {
  return ddb
    .query({
      ExpressionAttributeValues: {
        ":pk": PK,
        ":timestamp": timestamp,
      },
      KeyConditionExpression: `PK = :pk AND SK ${search === "high" ? ">=" : "<="} :timestamp`,
      Limit: 1,
      ScanIndexForward: search === "high",
    })
    .then((records) => {
      const item = records.Items?.[0]
      return item === undefined ? undefined : {
        height: item.height,
        timestamp: item.SK
      } as TimestampBlock
    });
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const { chain, timestamp: timestampRaw } = event.pathParameters!
  const provider = getExtraProvider(chain)
  if (provider === undefined || chain === undefined) {
    return errorResponse({
      message: "We don't support the blockchain we provided, make sure to spell it correctly"
    })
  }
  const timestamp = Number(timestampRaw)
  if (Number.isNaN(timestamp)) {
    return errorResponse({
      message: "Timestamp needs to be a number"
    })
  }
  const isValid = await isAValidBlockAtThisTimestamp(timestamp, provider);
  if (!isValid)
    return successResponse({
      error: `requested timestamp is either before genesis or after now`,
    });
  let [top, bottom] = await Promise.all([
    getClosestBlock(blockPK(chain), timestamp, "high"),
    getClosestBlock(blockPK(chain), timestamp, "low")
  ])
  if (top === undefined) {
    top = await getBlock(provider, "latest", chain);
    const currentTimestamp = getCurrentUnixTimestamp()
    if ((top.timestamp - currentTimestamp) < -30 * 60) {
      throw new Error(`Last block of chain "${chain}" is further than 30 minutes into the past`)
    }
  }
  if (bottom == undefined) {
    bottom = {
      height: chain === "terra" ? 4724001 : 0,
      timestamp: 0
    }
  }

  let high = top.height;
  let low = bottom.height;
  let block = top;
  while ((high - low) > 1) {
    const mid = Math.floor((high + low) / 2);
    block = await getBlock(provider, mid, chain);
    if (block.timestamp < timestamp) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  };
  if (Math.abs(block.timestamp - timestamp) > 3600) {
    throw new Error("Block selected is more than 1 hour away from the requested timestamp")
  }
  return successResponse(block);
}

export default wrap(handler);