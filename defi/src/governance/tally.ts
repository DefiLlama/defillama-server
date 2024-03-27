

import { sliceIntoChunks, } from '@defillama/sdk/build/util/index'
import { log, } from '@defillama/sdk'
import { graphURLTally, metadataQueryTally, proposalQueryTally, } from './snapshotQueries'
import axios from 'axios'
import { getTally, setTally, getTallyOverview, setTallyOverview, } from './cache'
import { GovCache, Proposal, } from './types'
import { updateStats, getGovernanceSources, getChainNameFromId, } from './utils'
const TALLY_API_KEY = process.env.TALLY_API_KEY ?? 'bfd8e8db995ffb776a8818329b40f32fec48822ed7b67c45b062c1ac6ce601c9'

const missing = [
  'eip155:1:0x7e880d8bD9c9612D6A9759F96aCD23df4A4650E6',
  'eip155:1:0xDA9C9eD96f6D42f7e74f3C7eEa6772d64eD84bdf',
  'eip155:10:0xcDF27F107725988f2261Ce2256bDfCdE8B382B10',
  'eip155:1:0x2BbEbFECA0fEbde8C70EF8501C991f3AB2095862',
  'eip155:137:0x26217Ec5044AEB8D6495BC68eE91951cd7Bb02a0',
  'eip155:1:0x6CC90C97a940b8A3BAA3055c809Ed16d609073EA',
  'eip155:1:0x5d2C31ce16924C2a71D317e5BbFd5ce387854039',
  'eip155:137:0xac1fdCA2Be645E3e06c7832613a78C72135DA945',
  'eip155:1:0x6C7aF43Ce97686e0C8AcbBc03b2E4f313c0394C7',
  'eip155:1:0xaBB55d166Bb028d0d73c9aA31e294c88cFE29579',
  'eip155:1:0x80BAE65E9D56498c7651C34cFB37e2F417C4A703',
  'eip155:137:0xd7f337d597E4A5d891b7882aBcB4C1d3f7D4Cb97',
  'eip155:137:0x4Db7E521942BDA8b1fB1B310280135ba4B9c2bee',
  'eip155:1:0x874C5D592AfC6803c3DD60d6442357879F196d5b',
  'eip155:1:0xDBd38F7e739709fe5bFaE6cc8eF67C3820830E0C',
  'eip155:1:0x8a994C6F55Be1fD2B4d0dc3B8f8F7D4E3a2dA8F1',
  'eip155:1:0x690e775361AD66D1c4A25d89da9fCd639F5198eD',
  'eip155:1:0x54F50d2f584F1DD05307aB5eB298Ba96C7d4E0ea',
  'eip155:1:0xd101f2B25bCBF992BdF55dB67c104FE7646F5447',
  'eip155:1:0xDbD27635A534A3d3169Ef0498beB56Fb9c937489',
  'eip155:1:0xBEC3de5b14902C660Bd2C7EfD2F259998424cc24',
  'eip155:1:0x7757f7f21F5Fa9b1fd168642B79416051cd0BB94',
  'eip155:1:0x323A76393544d5ecca80cd6ef2A560C6a395b7E3',
  'eip155:1:0x0BEF27FEB58e857046d630B2c03dFb7bae567494',
  'eip155:1:0x710C7E422A98963d6BA216840b1d83E77064A031',
]

export function getTallyIds() {
  const idSet = new Set()
  missing.forEach((i: any) => idSet.add(i))
  const addSnapshot = (i: any) => i.governanceID?.filter((j: any) => j.startsWith('eip155:')).forEach((j: any) => idSet.add(j))
  getGovernanceSources().map(addSnapshot)
  return [...idSet]
}

export async function getMetadata(ids: string[]) {
  const { data: { data: { governors, } } } = await axios.post(graphURLTally, {
    query: metadataQueryTally,
    operationName: 'Governers',
    variables: { ids },
  }, {
    headers: {
      'ContentType': 'application/json',
      "Api-Key": TALLY_API_KEY
    }
  })
  return governors
}

export async function getProposals(ids: string[], chain: string, recent?: boolean) {
  if (!ids.length) return []
  const ONE_WEEK = 7 * 24 * 3600 * 1000
  const cutOfTime = +Date.now() - 12 * ONE_WEEK * 3
  const allProposals: Proposal[] = []
  let fetchAgain = false
  const variables: any = { ids, skip: 0, chain, length: 200, }
  if (recent) variables.length = 100
  do {
    const { data: { data } }  = await axios.post(graphURLTally, {
      query: proposalQueryTally,
      operationName: 'Proposals',
      variables,
    }, {
      headers: {
        'ContentType': 'application/json',
        "Api-Key": TALLY_API_KEY
      }
    })
    const { proposals = [], } = data ?? {}
    allProposals.push(...proposals)
    fetchAgain = proposals?.length && proposals?.length === variables.length
    if (fetchAgain) {
      variables.skip += length
      if (recent) {
        const lastProposal = proposals[proposals.length - 1]
        if (+new Date(lastProposal.createdTransaction.block.timestamp) > cutOfTime) fetchAgain = false
      }
      log('Fetching more recent Tallys', variables)
    }
  } while (fetchAgain)
  return allProposals
}

export async function updateTallys() {
  const overview = await getTallyOverview()
  const idsAll = getTallyIds()
  log('tally gov#', idsAll.length)
  const idChunks = sliceIntoChunks(idsAll, 31)
  for (const ids of idChunks) {
    const metadataAll = await getMetadata(ids)
    const caches: GovCache[] = await Promise.all(ids.map(getTally))
    const idMap: { [key: string]: GovCache } = {}
    ids.forEach((id, i) => idMap[id] = caches[i])
    const firstFetchIds: string[] = []
    const fetchOnlyProposals: string[] = []
    metadataAll.forEach((v: any) => {
      if (!idMap[v.id]) {
        console.log('missing', v.id)
        idMap[v.id] = {} as any
      }
      idMap[v.id].metadata = v
      const [chainStr] = chainAndAddrFromId(v.id)
      v.network = chainStr.split(':')[1]
      v.chainName = getChainNameFromId(v.network)
      v.symbol = (v.tokens ?? [])[0]?.symbol
      v.strategies = v.tokens
      idMap[v.id].id = v.id
      v.quorumVotes = +(v.quorum ?? 0)
      v.proposalsCount = v.proposalStats.total
      if (!idMap[v.id].proposals) firstFetchIds.push(v.id)
      else fetchOnlyProposals.push(v.id)
    })

    for (const id of firstFetchIds) await addAllProposals(idMap[id])
    const recentProposals = []
    const chainMap: any = {}
    fetchOnlyProposals.forEach(i => {
      const [chain, addr] = chainAndAddrFromId(i)
      if (!chainMap[chain]) chainMap[chain] = []
      chainMap[chain].push(addr)
    })
    for (const [chain, govs] of Object.entries(chainMap)) {
      const proposals = await getProposals(govs as any, chain, true)
      recentProposals.push(...proposals)
    }
    recentProposals.forEach((i: any) => {
      updateProposal(i, idMap[i.governanceId])
    })
    Object.entries(idMap).map(([id, cache]) => updateStats(cache, overview, id))
    await Promise.all(Object.values(idMap).map(cache => setTally(cache.id, cache)))
  }
  await setTallyOverview(overview)


  async function addAllProposals(cache: GovCache) {
    cache.proposals = {}
    const [chain, id] = chainAndAddrFromId(cache.id)
    const proposals = await getProposals([id], chain)
    proposals.forEach((v) => cache.proposals![v.id] = v)
    proposals.map(i => updateProposal(i, cache))
    updateStats(cache, overview, cache.id)
    await setTally(cache.id, cache)
  }

}

function chainAndAddrFromId(id: string) {
  const str = id.split(':')
  return [str.slice(0, 2).join(':'), str[2]]
}


async function updateProposal(data: any, cache: any) {
  let {
    // start,
    // end,
    voteStats,
    startBlock,
    endBlock,
    statusChanges,
    eta,
    governanceId,
  } = data
  // if (typeof start === 'object' && start.timestamp) {
  //   if (!startBlock) startBlock = start.number
  //   start = Math.floor(+new Date(start.timestamp) / 1e3)
  // }

  // if (typeof end === 'object' && end.timestamp) {
  //   if (!endBlock) endBlock = end.number
  //   end = Math.floor(+new Date(end.timestamp) / 1e3)
  // }

  statusChanges.sort((a: any, b: any) => +new Date(a.blockTimestamp) - +new Date(b.blockTimestamp))
  const lastStatus = statusChanges.pop()
  const canceled = lastStatus.type === 'CANCELED'
  const executed = lastStatus.type === 'EXECUTED'
  const state = capitalizeFirstLetter(lastStatus.type)
  const tokenDecimals = cache.metadata.tokens[0].decimals ?? 0

  function getVote(vType: any) {
    const voteObj = voteStats.find((i: any) => i.support === vType)
    if (voteObj?.weight) return +voteObj.weight / (10 ** tokenDecimals)
    return 0
  }

  const scores = [getVote('FOR'), getVote('AGAINST'), getVote('ABSTAIN'),]
  const scores_total = scores.reduce((acc, i) => acc + i, 0)

  let proposal = {
    ...data,
    // start, end,
    startBlock, endBlock, canceled, executed, eta,
    state, scores, scores_total,
    choices: ['For', 'Against', 'Abstain'],
    network: governanceId.split(':')[1],
    app: 'tally',
    space: {
      id: cache.metadata.id,
    },
    quorum: cache.metadata.quorumVotes ?? 0,
    votes: 0,
    score_skew: 0,
    score_curve: 0,
    score_curve2: 0,
  }

  cache.proposals[data.id] = proposal
}

function capitalizeFirstLetter(str: string) {
  if (typeof str !== 'string') {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}