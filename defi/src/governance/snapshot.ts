
import { sliceIntoChunks } from '@defillama/sdk/build/util/index'
import { graphURL, metadataQuery, proposalQuery, } from './snapshotQueries'
import axios from 'axios'
import { getSnapshot, setSnapshot, getSnapshotOverview, setSnapshotOverview, } from './cache'
import { GovCache, Proposal, } from './types'
import { updateStats, getGovernanceSources, getChainNameFromId, } from './utils'

export function getSnapshotIds() {
  const snapshotIds = new Set()
  const addSnapshot = (i: any) => i.governanceID?.filter((j: any) => j.startsWith('snapshot:')).forEach((j: any) => snapshotIds.add(j))
  getGovernanceSources().map(addSnapshot)
  return [...snapshotIds].map((i: any) => i.replace('snapshot:', ''))
}

export async function getSnapshotMetadata(ids: string[]) {
  const { data: { data: { spaces, } } } = await axios.post(graphURL, {
    query: metadataQuery,
    operationName: 'Spaces',
    variables: { ids },
  }, {
    headers: {
      'ContentType': 'application/json',
    }
  })
  return spaces
}

export async function getProposals(ids: string[], recent?: boolean) {
  if (!ids.length) return []
  const ONE_WEEK = 7 * 24 * 3600
  const allProposals: Proposal[] = []
  const length = 1000
  let fetchAgain = false
  const variables: any = { ids, skip: 0, }
  if (recent) variables.startFrom = Math.floor(+Date.now() / 1e3 - (ONE_WEEK * 12))
  do {
    const { data: { data: { proposals, } } } = await axios.post(graphURL, {
      query: proposalQuery,
      operationName: 'Proposals',
      variables,
    }, {
      headers: {
        'ContentType': 'application/json',
      }
    })
    fetchAgain = proposals?.length === length
    if (fetchAgain)
      variables.skip += length
    allProposals.push(...proposals)
  } while (fetchAgain)
  return allProposals
}

export async function updateSnapshots() {
  const overview = await getSnapshotOverview()
  const idsAll = getSnapshotIds()
  console.log('snapshot gov#', idsAll.length)
  const idChunks = sliceIntoChunks(idsAll, 31)
  for (const ids of idChunks) {
    const metadataAll = await getSnapshotMetadata(ids)
    const caches: GovCache[] = await Promise.all(ids.map(getSnapshot))
    const idMap: { [key: string]: GovCache } = {}
    ids.forEach((id, i) => idMap[id] = caches[i])
    const firstFetchIds: string[] = []
    const fetchOnlyProposals: string[] = []
    metadataAll.forEach((v: any) => {
      idMap[v.id].metadata = v
      if (v.network) v.chainName = getChainNameFromId(v.network)
      idMap[v.id].id = v.id
      if (!idMap[v.id].proposals) firstFetchIds.push(v.id)
      else fetchOnlyProposals.push(v.id)
    })

    for (const id of firstFetchIds) await addAllProposals(idMap[id])
    const recentProposals = await getProposals(fetchOnlyProposals, true)
    recentProposals.forEach(i => {
      const proposals = idMap[i.space.id].proposals!
      proposals[i.id] = { ...(proposals[i.id] ?? {}), ...i }
    })
    Object.entries(idMap).map(([id, cache]) => updateStats(cache, overview, id))
    await Promise.all(Object.values(idMap).map(cache => setSnapshot(cache.id, cache)))
    // await Promise.all(fetchOnlyProposals.map(id => setSnapshot(id, idMap[id])))
  }
  await setSnapshotOverview(overview)


  async function addAllProposals(cache: GovCache) {
    cache.proposals = {}
    const proposals = await getProposals([cache.id])
    proposals.forEach((v) => cache.proposals![v.id] = v)
    // updateStats(cache, overview)
    await setSnapshot(cache.id, cache)
  }

}