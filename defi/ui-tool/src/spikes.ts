import * as sdk from '@defillama/sdk'
import { detectSpikesForProtocol } from '../../src/api2/scripts/tvlSpikeDetector'
import fetch from 'node-fetch'

const ES_INDEX = 'tvl-spike-detector'
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY
const API_BASE = INTERNAL_API_KEY ? `https://pro-api.llama.fi/${INTERNAL_API_KEY}/api` : 'https://api.llama.fi'
const MIN_TVL = Number(process.env.TVL_SPIKE_MIN_TVL ?? 100_000)

function getIndexPattern() {
  return `${ES_INDEX}-*`
}

export async function runSpikesCommand(ws: any, data: any) {
  const { action } = data
  console.log('Running spikes action:', action)

  switch (action) {
    case 'spikes-get-list':
      await getSpikesData(ws)
      return
    case 'spikes-run-detection':
      await runDetection(ws, data)
      return
    case 'spikes-update-record':
      await updateSpikeRecord(ws, data)
      return
    case 'spikes-bulk-update':
      await bulkUpdateSpikeRecords(ws, data)
      return
    default:
      console.error('Unknown spikes action:', action)
      break
  }
}

async function getSpikesData(ws: any) {
  try {
    const allLogs = await sdk.elastic.getAllLogs({
      index: getIndexPattern(),
      size: 10000,
      query: { match_all: {} },
    })

    const records = allLogs.map((log: any, i: number) => ({
      ...log,
      _id: `${log.protocolId}-${log.event?.startTimestamp}-${log.event?.type}-${log.event?.chain || 'global'}-${i}`,
    }))

    ws.send(JSON.stringify({
      type: 'spikes-list-response',
      data: records,
    }))

    console.log(`Sent ${records.length} spike records to client`)
  } catch (e: any) {
    console.error('Failed to fetch spikes data:', e.message)
    ws.send(JSON.stringify({
      type: 'spikes-list-response',
      data: [],
    }))
  }
}

async function runDetection(ws: any, data: any) {
  const { protocolName, writeToEs } = data
  const allReports: any[] = []

  try {
    const protocols: any[] = await fetch(`${API_BASE}/protocols`).then((r: any) => r.json())

    let targets: any[]
    if (protocolName) {
      const match = protocols.find((p: any) =>
        p.name.toLowerCase() === protocolName.toLowerCase() ||
        p.slug?.toLowerCase() === protocolName.toLowerCase()
      )
      if (!match) {
        console.error(`Protocol "${protocolName}" not found`)
        return
      }
      targets = [match]
    } else {
      targets = protocols.filter((p: any) => p.tvl >= MIN_TVL)
    }

    console.log(`Running detection for ${targets.length} protocol(s)...`)

    for (let i = 0; i < targets.length; i++) {
      const p = targets[i]
      try {
        if (targets.length > 1 && i % 50 === 0) {
          console.log(`Progress: ${i}/${targets.length}`)
        }
        const reports = await detectSpikesForProtocol(
          p.name, String(p.id), p.slug, p.tvl,
          { verbose: targets.length === 1, dryRun: !writeToEs }
        )
        allReports.push(...reports)
      } catch (e: any) {
        console.error(`Error processing ${p.name}: ${e.message}`)
      }
    }

    console.log(`Detection complete. Found ${allReports.length} events.`)

    // Send results directly to client
    const records = allReports.map((log: any, i: number) => ({
      ...log,
      _id: `${log.protocolId}-${log.event?.startTimestamp}-${log.event?.type}-${log.event?.chain || 'global'}-${i}`,
    }))

    ws.send(JSON.stringify({
      type: 'spikes-list-response',
      data: records,
    }))
  } catch (e: any) {
    console.error('Detection failed:', e.message)
  }
}

async function updateSpikeRecord(ws: any, data: any) {
  const { protocolId, startTimestamp, eventType, chain, updates } = data

  try {
    const client = sdk.elastic.getClient()
    if (!client) {
      console.error('Elasticsearch client not configured')
      return
    }

    const result = await sdk.elastic.search({
      index: getIndexPattern(),
      body: {
        query: {
          bool: {
            must: [
              { term: { 'protocolId.keyword': String(protocolId) } },
              { term: { 'event.startTimestamp': startTimestamp } },
              { term: { 'event.type.keyword': eventType } },
              ...(chain && chain !== 'global' ? [{ term: { 'event.chain.keyword': chain } }] : []),
            ]
          }
        },
        size: 1,
      }
    })

    const hits = result.hits?.hits
    if (!hits?.length) {
      console.error('Record not found for update')
      return
    }

    const docId = hits[0]._id
    const index = hits[0]._index

    await client.update({
      index,
      id: docId!,
      body: {
        doc: updates,
      },
    })

    console.log(`Updated spike record: ${protocolId} ${eventType} at ${startTimestamp}`)

    await getSpikesData(ws)
  } catch (e: any) {
    console.error('Failed to update spike record:', e.message)
  }
}

async function bulkUpdateSpikeRecords(ws: any, data: any) {
  const { records, updates } = data

  try {
    const client = sdk.elastic.getClient()
    if (!client) {
      console.error('Elasticsearch client not configured')
      return
    }

    let updated = 0
    for (const rec of records) {
      try {
        const result = await sdk.elastic.search({
          index: getIndexPattern(),
          body: {
            query: {
              bool: {
                must: [
                  { term: { 'protocolId.keyword': String(rec.protocolId) } },
                  { term: { 'event.startTimestamp': rec.startTimestamp } },
                  { term: { 'event.type.keyword': rec.eventType } },
                  ...(rec.chain && rec.chain !== 'global' ? [{ term: { 'event.chain.keyword': rec.chain } }] : []),
                ]
              }
            },
            size: 1,
          }
        })

        const hits = result.hits?.hits
        if (!hits?.length) continue

        await client.update({
          index: hits[0]._index,
          id: hits[0]._id!,
          body: { doc: updates },
        })
        updated++
      } catch (e: any) {
        console.error(`Failed to update record for ${rec.protocolId}: ${e.message}`)
      }
    }

    console.log(`Bulk updated ${updated}/${records.length} spike records`)
    await getSpikesData(ws)
  } catch (e: any) {
    console.error('Bulk update failed:', e.message)
  }
}
