import protocols, { Protocol } from '../protocols/data'
import parentProtocols from '../protocols/parentProtocols'
import { sliceIntoChunks } from '@defillama/sdk/build/util/index'
import { graphURL, metadataQuery, proposalQuery, } from './snapshotQueries'
import axios from 'axios'
import { getSnapshot, setSnapshot, getSnapshotOverview, setSnapshotOverview, } from './cache'
import * as sdk from '@defillama/sdk'

export interface SnapshotCache {
  id: string;
  metadata: { [key: string]: any };
  proposals: { [key: string]: Proposal };
  stats?: { [key: string]: any };
}
export interface Proposal {
  id: string;
  state: string;
  space: any;
  scores: number[];
  scores_total: number;
  quorum: number;
  score_skew: number;
  score_curve: number;
  start: number;
  month: string;
  strategies?: any;
}


export function getSnapshotIds() {
  const snapshotIds =  new Set()
  const addSnapshot = (i: any) => i.governanceID?.filter((j: any) => j.startsWith('snapshot:')).forEach((j: any) => snapshotIds.add(j))
  protocols.map(addSnapshot)
  parentProtocols.map(addSnapshot)
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
  if (recent) variables.startFrom = Math.floor(+Date.now() / 1e3 - ONE_WEEK)
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
    const caches: SnapshotCache[] = await Promise.all(ids.map(getSnapshot))
    const idMap: { [key: string]: SnapshotCache } = {}
    ids.forEach((id, i) => idMap[id] = caches[i])
    const firstFetchIds: string[] = []
    const fetchOnlyProposals: string[] = []
    metadataAll.forEach((v: any) => {
      idMap[v.id].metadata = v
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
    Object.values(idMap).map(updateStats)
    await Promise.all(Object.values(idMap).map(cache => setSnapshot(cache.id, cache)))
    // await Promise.all(fetchOnlyProposals.map(id => setSnapshot(id, idMap[id])))
  }
  await setSnapshotOverview(overview)


  async function addAllProposals(cache: SnapshotCache) {
    cache.proposals = {}
    const proposals = await getProposals([cache.id])
    proposals.forEach((v) => cache.proposals![v.id] = v)
    updateStats(cache)
    await setSnapshot(cache.id, cache)
  }

  function updateStats(cache: SnapshotCache) {
    if (!cache.proposals) sdk.log('Updating: ', cache.id)
    if (!cache.proposals) cache.proposals = {}
    const { proposals, metadata } = cache
    const proposalsArray = Object.values(proposals)
    const stats = cache.stats ?? {}

    stats.proposalsCount = metadata.proposalsCount
    stats.successfulProposals = proposalsArray.filter(isSuccessfulProposal).length
    stats.followersCount = metadata.followersCount
    stats.name = metadata.name
    stats.id = metadata.id
    stats.strategyCount = metadata.strategies.length
    stats.followersCount = metadata.followersCount

    proposalsArray.forEach(i => {
      i.month = (new Date(i.start * 1000)).toISOString().slice(0, 7)
      delete i.strategies
      if (i.scores_total > 1) {
        const highestScore = max(i.scores)
        i.score_skew = highestScore! / i.scores_total
        i.score_curve = i.scores_total * (i.score_skew >= 0.5 ? 0.5 - 0.5 * i.score_skew : 0.5 * i.score_skew)
      }
    })

    stats.proposalsByDate = [...proposalsArray].sort((a, b) => b.start - a.start).map(i => i.id)
    stats.proposalsBySkew = [...proposalsArray].sort((a, b) => a.score_skew - b.score_skew).map(i => i.id)
    stats.proposalsByScore = [...proposalsArray].sort((a, b) => b.scores_total - a.scores_total).map(i => i.id)
    stats.propsalsInLast30Days = proposalsArray.filter(isProposalUnderAMonth).length
    stats.successfulPropsalsInLast30Days = proposalsArray.filter(isProposalUnderAMonth).filter(isSuccessfulProposal).length

    addStateSplit(stats, proposalsArray)
    addDateSplit(stats, proposalsArray)

    const id = stats.id
    overview[id] = { ...overview[id], ...stats }
    const skipFields = ['proposalsByDate', 'proposalsBySkew', 'proposalsByScore',]
    skipFields.forEach(field => delete overview[id][field])

    cache.stats = stats


    function addStateSplit(obj: any, arry: any) {
      obj.states = arry.reduce((acc: any, i: any) => {
        if (!acc[i.state]) acc[i.state] = 0
        acc[i.state] += 1
        return acc
      }, {})
    }

    function addDateSplit(obj: any, arry: any) {
      obj.months = arry.reduce((acc: any, i: any) => {
        if (!acc[i.month]) acc[i.month] = { proposals: [] }
        acc[i.month].proposals.push(i.id)
        return acc
      }, {})

      // get state split within each month
      Object.values(obj.months).forEach((obj: any) => {
        const _props = obj.proposals.map((i: any) => proposals[i])
        addStateSplit(obj, _props)
      })
    }
  }

  function isSuccessfulProposal(i: Proposal) {
    return i.state === 'closed' && i.scores_total > i.quorum
  }

  function isProposalUnderAMonth(i: Proposal) {
    const ONE_MONTH = 30 * 24 * 3600
    return (i.start + ONE_MONTH) > +Date.now() / 1e3
  }
}

function max(arry: number[]) {
  return arry.reduce((prev, curr) => curr > prev ? curr : prev)
}