
import * as sdk from '@defillama/sdk'
import { GovCache, Proposal, } from './types'
import protocols, { Protocol } from '../protocols/data'
import parentProtocols from '../protocols/parentProtocols'
import { chainCoingeckoIds } from '../utils/normalizeChain'
export { getChainNameFromId } from '../utils/normalizeChain'

export function getGovernanceSources() {
  return [
    protocols,
    parentProtocols,
    Object.values(chainCoingeckoIds),
  ].flat()
}

const ONE_YEAR = 365 * 24 * 3600
const ONE_MONTH = 30 * 24 * 3600

function isProposalUnderAMonth(i: Proposal) {
  return (i.start + ONE_MONTH) > +Date.now() / 1e3
}

export function toHex(i: number) {
  return '0x' + (+i).toString(16)
}

export function updateStats(cache: GovCache, overview: any, _id: any) {
  if (Object.values(cache).length === 0) {
    sdk.log('Found empty: Find and fix the bug, id: ', _id)
    return;
  }
  if (!cache.proposals) sdk.log('Updating: ', cache)
  if (!cache.proposals) cache.proposals = {}
  const { proposals, metadata } = cache
  const proposalsArray = Object.values(proposals)
  const stats = cache.stats ?? {}

  const highestTotalScore = max(proposalsArray.map(i => i.scores_total))
  const timeNow = Math.floor(Date.now() / 1e3)

  stats.proposalsCount = metadata.proposalsCount
  stats.successfulProposals = proposalsArray.filter(isSuccessfulProposal).length
  stats.followersCount = metadata.followersCount
  stats.name = metadata.name
  stats.chainName = metadata.chainName
  stats.id = metadata.id
  stats.strategyCount = metadata.strategies.length
  stats.followersCount = metadata.followersCount
  stats.highestTotalScore = highestTotalScore

  proposalsArray.forEach(i => {
    if (!i.start) i.start = 0
    if (!i.end) i.end = timeNow
    const tempEndDate = i.end - timeNow > 3 * ONE_MONTH ? timeNow : i.end
    if (tempEndDate - i.start > ONE_YEAR) i.start = tempEndDate - ONE_MONTH
    i.month = (new Date(i.start * 1000)).toISOString().slice(0, 7)
    delete i.strategies
    if (i.scores_total > 1) {
      const highestScore = max(i.scores)
      const quorumNumber = i.quorum > 0 ? i.quorum : highestTotalScore / 100
      i.score_skew = highestScore! / i.scores_total
      const curve_input = i.score_skew >= 0.5 ? 0.5 - 0.5 * i.score_skew : 0.5 * i.score_skew
      const curve_input2 = Math.sqrt(i.scores_total / quorumNumber)
      i.score_curve = i.scores_total * curve_input
      i.score_curve2 = curve_input * curve_input2
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
  overview[id] = { ...(overview[id] ?? {}), ...stats }
  const skipFields = ['proposalsByDate', 'proposalsBySkew', 'proposalsByScore',]
  skipFields.forEach(field => delete overview[id][field])

  cache.stats = stats

  function isSuccessfulProposal(i: Proposal) {
    if (['Succeeded', 'Queued', 'Executed'].includes(i.state)) return true
    if (i.hasOwnProperty('executed')) return i.executed
    let quorum = i.quorum
    if (quorum < 1) {
      const minScore = stats.metadata?.filters?.minScore ?? 0
      quorum = minScore > 0 ? minScore : highestTotalScore / 100
    }
    return i.state === 'closed' && i.scores_total > quorum
  }

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
      obj.total = _props.length
      obj.successful = _props.filter(isSuccessfulProposal).length
      addStateSplit(obj, _props)
    })
  }
}

function max(arry: number[], initial = 0) {
  return arry.reduce((prev, curr) => curr > prev ? curr : prev, initial)
}