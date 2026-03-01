import axios from 'axios'
import * as sdk from '@defillama/sdk'
import { getCurve, setCurve, getCurveOverview, setCurveOverview, } from './cache'
import { GovCache, Proposal, } from './types'
import { updateStats, } from './utils'

const CURVE_API = 'https://prices.curve.finance/v1/dao/proposals'
const VOTE_DURATION = 7 * 24 * 3600 // Aragon votes last 7 days
const PAGE_SIZE = 100

const CURVE_GOV_ID = 'curve'
const REQUEST_TIMEOUT = 30_000

interface CurveProposalRaw {
  vote_id: number
  vote_type: string
  creator: string
  start_date: number
  snapshot_block: number
  ipfs_metadata: string
  metadata: string | null
  votes_for: string
  votes_against: string
  vote_count: number
  support_required: string
  min_accept_quorum: string
  total_supply: string
  executed: boolean
  execution_tx: string | null
  execution_date: string | null
  transaction_hash: string
  dt: string
}

interface CurveAPIResponse {
  proposals: CurveProposalRaw[]
  page: number
  count: number
}

/** Derives proposal state from on-chain Aragon voting thresholds (support_required, min_accept_quorum) */
function getProposalState(p: CurveProposalRaw): string {
  const now = Math.floor(Date.now() / 1e3)
  const endTime = p.start_date + VOTE_DURATION

  if (now < endTime) return 'Active'
  if (p.executed) return 'Executed'

  const votesFor = BigInt(p.votes_for)
  const votesAgainst = BigInt(p.votes_against)
  const totalVotes = votesFor + votesAgainst
  const supportRequired = BigInt(p.support_required)
  const minQuorum = BigInt(p.min_accept_quorum)
  const totalSupply = BigInt(p.total_supply)
  const precision = BigInt('1000000000000000000')

  const hasSupport = totalVotes > 0n && (votesFor * precision / totalVotes) >= supportRequired
  const hasQuorum = totalSupply > 0n && (votesFor * precision / totalSupply) >= minQuorum

  if (hasSupport && hasQuorum) return 'Passed'
  return 'Denied'
}

/** Converts a raw Curve API proposal to the DefiLlama Proposal format */
function toProposal(p: CurveProposalRaw): Proposal {
  const votesFor = Number(BigInt(p.votes_for) / BigInt('1000000000000000000'))
  const votesAgainst = Number(BigInt(p.votes_against) / BigInt('1000000000000000000'))
  const scores = [votesFor, votesAgainst]
  const scores_total = votesFor + votesAgainst
  const totalSupply = Number(BigInt(p.total_supply) / BigInt('1000000000000000000'))
  const minQuorumFraction = Number(BigInt(p.min_accept_quorum)) / 1e18
  const quorum = totalSupply * minQuorumFraction

  const state = getProposalState(p)
  const id = `${p.vote_type}-${p.vote_id}`
  const title = p.metadata ?? p.ipfs_metadata ?? `${p.vote_type} vote #${p.vote_id}`
  const end = p.start_date + VOTE_DURATION
  const link = `https://dao.curve.fi/vote/${p.vote_type}/${p.vote_id}`

  return {
    id,
    title,
    state,
    app: 'curve',
    author: p.creator,
    space: { id: CURVE_GOV_ID },
    choices: ['For', 'Against'],
    network: '1',
    scores,
    scores_total,
    quorum,
    votes: p.vote_count,
    score_skew: 0,
    score_curve: 0,
    score_curve2: 0,
    start: p.start_date,
    end,
    executed: p.executed,
    link,
  }
}

/** Fetches all Curve DAO proposals via paginated API calls (used on first run) */
async function fetchAllProposals(): Promise<CurveProposalRaw[]> {
  const all: CurveProposalRaw[] = []
  let page = 1

  // first request to get total count
  const { data: first } = await axios.get<CurveAPIResponse>(CURVE_API, {
    params: { pagination: PAGE_SIZE, page: 1, status_filter: 'all', type_filter: 'all' },
    timeout: REQUEST_TIMEOUT,
  })
  all.push(...first.proposals)
  const totalPages = Math.ceil(first.count / PAGE_SIZE)
  sdk.log('Curve governance: fetching', first.count, 'proposals across', totalPages, 'pages')

  for (page = 2; page <= totalPages; page++) {
    const { data } = await axios.get<CurveAPIResponse>(CURVE_API, {
      params: { pagination: PAGE_SIZE, page, status_filter: 'all', type_filter: 'all' },
      timeout: REQUEST_TIMEOUT,
    })
    all.push(...data.proposals)
  }

  return all
}

/** Fetches recent Curve DAO proposals (first 3 pages) for incremental updates */
async function fetchRecentProposals(): Promise<CurveProposalRaw[]> {
  // fetch first 3 pages (300 proposals) to catch any recent activity
  const all: CurveProposalRaw[] = []
  for (let page = 1; page <= 3; page++) {
    const { data } = await axios.get<CurveAPIResponse>(CURVE_API, {
      params: { pagination: PAGE_SIZE, page, status_filter: 'all', type_filter: 'all' },
      timeout: REQUEST_TIMEOUT,
    })
    all.push(...data.proposals)
    if (data.proposals.length < PAGE_SIZE) break
  }
  return all
}

/** Main entry point: fetches Curve Aragon governance proposals and updates the cache */
export async function updateCurve() {
  const overview: any = await getCurveOverview()
  const cache: GovCache = await getCurve(CURVE_GOV_ID) as any

  const isFirstFetch = !cache.proposals || Object.keys(cache.proposals).length === 0

  if (!cache.metadata) {
    cache.metadata = {
      id: CURVE_GOV_ID,
      name: 'Curve Finance',
      network: '1',
      chainName: 'Ethereum',
      symbol: 'veCRV',
      strategies: [{
        name: 'erc20-balance-of',
        network: '1',
        params: {
          symbol: 'veCRV',
          address: '0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2',
          decimals: 18,
        },
      }],
    }
  }
  if (!cache.proposals) cache.proposals = {}
  cache.id = CURVE_GOV_ID

  try {
    const rawProposals = isFirstFetch ? await fetchAllProposals() : await fetchRecentProposals()
    sdk.log('Curve governance: processing', rawProposals.length, 'proposals')

    for (const raw of rawProposals) {
      const proposal = toProposal(raw)
      cache.proposals[proposal.id] = proposal
    }

    cache.metadata.proposalsCount = Object.keys(cache.proposals).length
    updateStats(cache, overview, CURVE_GOV_ID)
    await setCurve(CURVE_GOV_ID, cache)
    await setCurveOverview(overview)
    sdk.log('Curve governance: saved', Object.keys(cache.proposals).length, 'proposals')
  } catch (e) {
    console.error('Error updating Curve governance:', (e as any)?.message ?? e)
  }
}
