import { Client } from '@elastic/elasticsearch'

let _client: Client | undefined

export async function getClient() {
  if (!process.env.ELASTICSEARCH_URL || !process.env.ELASTICSEARCH_USERNAME || !process.env.ELASTICSEARCH_PASSWORD) return;
  if (!_client)
    _client = new Client({
      maxRetries: 3,
      requestTimeout: 5000,
      compression: true,
      node: process.env.ELASTICSEARCH_URL,
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      },
    })
  return _client
}

export async function writeLog(index: string, log: {
  [key: string]: any
}) {
  const client = await getClient()
  if (!client) return;
  index = addYearAndMonth(index)
  log.timestamp = +Date.now()
  try {
    await client.index({ index, body: log })
  } catch (error) {
    console.error(error)
  }
}

function addYearAndMonth(index: string) {
  const date = new Date()
  return `${index}-${date.getUTCFullYear()}-${date.getUTCMonth()}`
}

type Metadata = {
  application: string,
  tags?: string[],
  [key: string]: any
}

export async function addDebugLog(body: {
  data: object,
  metadata: Metadata,
}) {
  await writeLog('debug-logs', body)
}

export async function addRuntimeLog(body: {
  metadata: Metadata,
  runtime: number,
  success: boolean,
}) {
  await writeLog('debug-runtime-logs', body)
}

export async function addErrorLog(body: {
  error: object,
  metadata: Metadata,
}) {
  await writeLog('error-logs', body)
}