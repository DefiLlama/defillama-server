import protocols from '../protocols/data'
import parentProtocols from '../protocols/parentProtocols'
import { getCompound, setCompound, getCompoundOverview, setCompoundOverview, } from './cache'
import { CompoundCache, CompoundProposal, } from './types'
// import { getLogs, } from './getLogs'
import { getLogs, } from './getLogs'
import { updateStats,  toHex, } from './utils'
import * as sdk from '@defillama/sdk'
import { sliceIntoChunks } from '@defillama/sdk/build/util/index'
import { getProvider } from '@defillama/sdk/build/general'


export function getCompoundIds() {
  const snapshotIds = new Set()
  const addSnapshot = (i: any) => i.governanceID?.filter((j: any) => j.startsWith('compound:')).forEach((j: any) => snapshotIds.add(j))
  protocols.map(addSnapshot)
  parentProtocols.map(addSnapshot)
  return [...snapshotIds].map((i: any) => i.replace('compound:', ''))
}

export async function updateCompounds() {
  // const compoundIds = getCompoundIds()
  const compoundIds = allCompoundIds
  console.log('compound gov#', compoundIds.length)
  const overview: any = {}
  const idChunks = sliceIntoChunks(compoundIds, 2)

  for (const ids of idChunks) {
    console.log(ids, compoundIds.length)
    await Promise.all(ids.map(updateCache))
  }

  return setCompoundOverview(overview)

  async function updateCache(id: string) {
    const [chain, address] = id.split(':')
    const cache = await getCompound(id)
    if (!cache.metadata) cache.metadata = { id, chain, address }
    if (!cache.proposals) cache.proposals = {}
    const timestamp = Math.floor(Date.now() / 1e3)
    const api = new sdk.ChainApi({      chain,      timestamp,    })
    cache.id = id
    const provider = getProvider(chain)

    await updateMetadata()
    const logMap = await getProposalLogs()
    cache.metadata.proposalsCount = Object.values(logMap).length

    const missingIds: string[] = []

    Object.keys(logMap).forEach((id: string) => {
      const proposal = cache.proposals[id]
      if (!proposal) {
        missingIds.push(id)
      } else {
        const isProposalClosed = proposal.executed || proposal.canceled || isInvalidProposal(proposal)
        if (!isProposalClosed)
          missingIds.push(id)
      }
    })

    await updateProposals(missingIds)

    updateStats(cache, overview, cache.id)
    return setCompound(cache.id, cache)


    function isInvalidProposal(prop: CompoundProposal) {
      return prop.eta === 0 && prop.startBlock === 0 && prop.endBlock === 0
    }


    async function updateMetadata() {
      const metadata = cache.metadata
      const target = address
      const [name, quorumVotes,] = await Promise.all([
        api.call({ target, abi: 'string:name' }),
        api.call({ target, abi: 'uint256:quorumVotes' }),
        // api.call({ target, abi: 'string:symbol' }),
        // api.call({ target, abi: 'uint8:decimals' }),
        // api.call({ target, abi: 'uint256:proposalCount' }),
      ])
      metadata.name = name
      metadata.strategies = [
        {
          "name": "erc20-balance-of",
          "network": api.chainId,
          // "params": { symbol, address, decimals }
        }
      ]
      // metadata.symbol = symbol
      // metadata.proposalsCount = proposalsCount
      metadata.network = api.chainId
      metadata.quorumVotes = +quorumVotes
    }

    async function updateProposals(ids: string[]) {
      const proposalData = await api.multiCall({ abi: proposalAbi, target: address, calls: ids })
      return Promise.all(ids.map((v, i) => updateProposal(v, proposalData[i])))
    }

    async function updateProposal(id: string, data: any) {
      const { startBlock, endBlock, proposer, forVotes, againstVotes, abstainVotes, canceled, executed, eta, } = data
      let start = 0
      let end = 0
      if (startBlock !== 0)
        start = (await provider.getBlock(toHex(startBlock))).timestamp

      if (endBlock !== 0)
        end = (await provider.getBlock(toHex(endBlock))).timestamp

      const scores = [+forVotes, +againstVotes, +abstainVotes,]
      const scores_total = scores.reduce((acc, i) => acc + i, 0)

      let state = 'Active'
      if (executed || end < timestamp) state = 'Closed'
      else if (canceled) state = 'Rejected'
      else if (+forVotes > +againstVotes && scores_total > cache.metadata.quorumVotes) state = 'Queued'

      const description = (logMap[id] ?? '').trim()
      let title = description.includes('\n') ? description.split('\n')[0] : description
      if (title.length > 200) title = title.slice(0, 197) + '...'
      title = title.replace(/^#/, '').trim()


      let proposal: CompoundProposal = {
        id, start, end, startBlock, endBlock, canceled, executed, eta,
        title, state, scores, scores_total, description,
        author: proposer,
        choices: ['Yes', 'No', 'Abstain'],
        network: api.chainId + '',
        app: 'compound',
        // votes,
        space: {
          id: cache.metadata.id,
        },
        quorum: cache.metadata.quorumVotes,
        votes: 0,
        score_skew: 0,
        score_curve: 0,
        score_curve2: 0,
      }

      proposal.isInvalid = isInvalidProposal(proposal)
      cache.proposals[id] = proposal
    }

    async function getProposalLogs() {
      const fromBlocks: any = {
        ethereum: 12006099, // the deployment block of compound
      }
      const logs = await getLogs({
        api,
        onlyArgs: true,
        target: address,
        fromBlock: fromBlocks[chain],
        topics: ['0x7d84a6263ae0d98d3329bd7b46bb4e8d6f98cd35a7adb45c274c8b7fd5ebd5e0'],
        eventAbi: 'event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)',
      })
      const logMap: any = {}
      logs.forEach(({ id, description }: any) => logMap['' + id] = description)
      return logMap
    }
  }
}


const proposalAbi = "function proposals(uint256) view returns (uint256 id, address proposer, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool executed)"

const allCompoundIds = [
].map(i => 'ethereum:' + i)