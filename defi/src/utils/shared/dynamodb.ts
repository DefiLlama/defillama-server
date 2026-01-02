import { DynamoDBClient, } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocument, GetCommandInput, PutCommandInput, QueryCommandInput, UpdateCommandInput, DeleteCommandInput, ScanCommandInput, NumberValue } from "@aws-sdk/lib-dynamodb"
import sleep from "./sleep";

const mockDynamoDBClient = new DynamoDBClient({
  region: "local",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  }
});

const mockDynamoDBDocument = DynamoDBDocument.from(mockDynamoDBClient, {
  marshallOptions: {
    convertClassInstanceToMap: true,
  }
});

let ddbClient = mockDynamoDBClient;
let client = mockDynamoDBDocument;

try {
  ddbClient = new DynamoDBClient({
    ...(process.env.MOCK_DYNAMODB_ENDPOINT && {
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      sslEnabled: false,
      region: "local",
      maxAttempts: 10
    })
  });

  client = DynamoDBDocument.from(ddbClient, {
    marshallOptions: {
      convertClassInstanceToMap: true,
    }
  })
} catch (e) {
  if (process.env.LOCAL_TEST)
    console.info("Running in local test mode, using local DynamoDB instance");
  else
    throw e
}


export const TableName = process.env.tableName! || process.env.AWS_COINS_TABLE_NAME!

export type DynamoDBItemKey = GetCommandInput["Key"]

const dynamodb = {
  get: (
    key: DynamoDBItemKey,
    params?: Omit<GetCommandInput, "TableName">
  ) => client.get({ TableName, ...params, Key: key }).then((value) => {
    if (value.Item) fixDDBRecords(value.Item)
    return value
  }),
  put: (
    item: PutCommandInput["Item"],
    params?: Partial<PutCommandInput>
  ) => client.put({ TableName, ...params, Item: sanitizeForDDBWrite(item) }),
  query: (params: Omit<QueryCommandInput, "TableName">) =>
    client.query({ TableName, ...params }).then((value) => {
      if (value.Items?.length) fixDDBRecords(value.Items)
      return value
    }),
  update: (
    params: Omit<UpdateCommandInput, "TableName">
  ) => client.update({
    TableName,
    ...params,
    ...(params.ExpressionAttributeValues && {
      ExpressionAttributeValues: sanitizeForDDBWrite(params.ExpressionAttributeValues)
    })
  }),
  delete: (
    params: Omit<DeleteCommandInput, "TableName">
  ) => client.delete({ TableName, ...params }),
  batchGet: (keys: any) =>
    client
      .batchGet({
        RequestItems: {
          [TableName]: {
            Keys: keys
          }
        }
      }).then((value) => {
        if (value.Responses) fixDDBRecords(value.Responses)
        return value
      })
  ,
  scan: (params: Omit<ScanCommandInput, "TableName">) =>
    client.scan({ TableName, ...params }),
  getEnvSecrets: (key: DynamoDBItemKey = { PK: 'lambda-secrets' }) => client.get({ TableName: 'secrets', Key: key }),
  getExtensionTwitterConfig: (key: DynamoDBItemKey = { PK: 'twitter' }) => client.get({ TableName: 'secrets', Key: key }),
  putDimensionsData: (
    item: PutCommandInput["Item"],
    params?: Partial<PutCommandInput>
  ) => client.put({ TableName: 'fees-volume', ...params, Item: sanitizeForDDBWrite(item) }),
  putDimensionsDataBulk: (
    items: PutCommandInput["Item"][],
  ) => client.batchWrite({ RequestItems: { 'fees-volume': items.map((item) => ({ PutRequest: { Item: sanitizeForDDBWrite(item) } })) } }),
  putEventData: async (
    item: PutCommandInput["Item"],
  ) => {
    if (!item?.PK) {
      throw new Error("Item must have a PK");
    }
    if (!item.source) {
      throw new Error("Item must have a source");
    }

    if (!item.SK) {
      throw new Error("Item must have a SK");
    }

    item.SK_ORIGNAL = item.SK; // Store original SK for debugging
    item.SK = Math.floor(Date.now() / 1000) // Use current timestamp as SK
    item.sourceTag = process.env.SOURCE_TAG ?? 'unknown';
    try {
      let response = await client.put({ TableName: 'prod-event-table', Item: sanitizeForDDBWrite(item), })
      return response;
    } catch (e: any) {
      console.error("Failed to put event data", item.PK, item.source, e?.message || e);
    }
  },
};
export default dynamodb;

export async function getHistoricalValues(pk: string, lastKey = -1) {
  let items = [] as any[];
  do {
    const result = await dynamodb.query({
      ExpressionAttributeValues: {
        ":pk": pk,
        ":sk": lastKey
      },
      KeyConditionExpression: "PK = :pk AND SK > :sk"
    });
    lastKey = result.LastEvaluatedKey?.SK;
    if (result.Items !== undefined) {
      items = items.concat(result.Items);
    }
  } while (lastKey !== undefined);
  return items;
}

const maxWriteRetries = 6; // Total wait time if all requests fail ~= 1.2s
async function underlyingBatchWrite(
  items: any[],
  retryCount: number,
  failOnError: boolean
): Promise<void> {
  const output = await client
    .batchWrite({
      RequestItems: {
        [TableName]: items
      }
    })
    ;
  const unprocessed = output.UnprocessedItems?.[TableName] ?? [];
  if (unprocessed.length > 0) {
    // Retry algo
    if (retryCount < maxWriteRetries) {
      const wait = 2 ** retryCount * 10;
      const jitter = Math.random() * wait - wait / 2;
      await sleep(wait + jitter);
      return underlyingBatchWrite(unprocessed, retryCount + 1, failOnError);
    } else if (failOnError) {
      console.log("throttled", output?.UnprocessedItems);
      throw new Error("Write requests throttled");
    }
  }
}

function removeDuplicateKeys(
  items: PutCommandInput["Item"][]
) {
  const seenKeys = new Set<string>();
  return items.filter((item) => {
    if (!item?.PK) return false

    const key = `${item.PK}#${item.SK}`;
    if (seenKeys.has(key)) {
      return false;
    }
    seenKeys.add(key);
    return true;
  });
}

const batchWriteStep = 25; // Max items written at once are 25
// IMPORTANT: Duplicated items will be pruned
export async function batchWrite(
  items: PutCommandInput["Item"][],
  failOnError: boolean
) {
  const writeRequests = [];
  for (let i = 0; i < items.length; i += batchWriteStep) {
    const itemsToWrite = items.slice(i, i + batchWriteStep);
    const nonDuplicatedItems = removeDuplicateKeys(itemsToWrite);
    writeRequests.push(
      underlyingBatchWrite(
        nonDuplicatedItems.map((item) => ({ PutRequest: { Item: sanitizeForDDBWrite(item) } })),
        0,
        failOnError
      )
    );
  }
  await Promise.all(writeRequests);
}

const batchGetStep = 100; // Max 100 items per batchGet
export async function batchGet(keys: { PK: string; SK: number }[], retriesLeft = 3) {
  if (retriesLeft === 0) {
    console.log("Unprocessed batchGet reqs:", keys)
    throw new Error("Not all batchGet requests could be processed")
  }
  const requests = [];
  for (let i = 0; i < keys.length; i += batchGetStep) {
    requests.push(
      dynamodb
        .batchGet(removeDuplicateKeys(keys.slice(i, i + batchGetStep)))
    );
  }
  const responses = await Promise.all(requests)
  let processedResponses = ([] as any[]).concat(...responses.map(r => r.Responses![TableName]))
  const unprocessed = responses.map(r => r.UnprocessedKeys?.[TableName]?.Keys ?? []).flat()
  if (unprocessed.length > 0) {
    const missingResponses = await batchGet(unprocessed as any[], retriesLeft - 1)
    processedResponses = processedResponses.concat(missingResponses)
  }
  return processedResponses
}


export async function DELETE(keys: { PK: string; SK: number }[]): Promise<void> {
  const requests = [];
  for (const item of keys) {
    // console.log('deleting', item.PK, item.SK)
    if (item.PK && (item.SK == 0 || item.SK)) requests.push(dynamodb.delete({ Key: { PK: item.PK, SK: item.SK } }));
  }
  await Promise.all(requests);
  return;
}

/**
 * when we switched to using aws sdk v3, it started converting numbers into bigint, this reverts that
 * @param item
 */
export function fixDDBRecords(item: any): any {
  if (Array.isArray(item)) {
    return item.map(fixDDBRecords)
  } else if (typeof item === 'bigint') {
    return Number(item)
  } else if (typeof item === 'object' && item) {
    Object.entries(item).forEach(([key, value]) => {
      item[key] = fixDDBRecords(value)
    })
  }

  return item
}

function sanitizeForDDBWrite(value: any): any {
  if (value === null || value === undefined) return value;
  if (value instanceof NumberValue) return value;
  if (Array.isArray(value)) return value.map(sanitizeForDDBWrite);

  const type = typeof value;

  if (type === "bigint") return NumberValue.from(value.toString());

  if (type === "number") {
    if (!Number.isFinite(value)) return value.toString();
    if (Math.abs(value) > Number.MAX_SAFE_INTEGER) return NumberValue.from(value.toString());
    return value;
  }

  if (type === "object") {
    const out: any = {};
    for (const [k, val] of Object.entries(value)) out[k] = sanitizeForDDBWrite(val);
    return out;
  }

  return value;
}