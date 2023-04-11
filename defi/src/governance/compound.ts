import { getCompound, setCompound, getCompoundOverview, setCompoundOverview, } from './cache'
import { CompoundCache, CompoundProposal, } from './types'
import { getLogs, } from './getLogs'
import { updateStats, toHex, getGovernanceSources, getChainNameFromId } from './utils'
import * as sdk from '@defillama/sdk'
import { sliceIntoChunks } from '@defillama/sdk/build/util/index'
import { getProvider } from '@defillama/sdk/build/general'

const PROPOSAL_STATES = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed']

export function getCompoundIds(existingIds: string[]) {
  let compoundIds = new Set(existingIds.map(i => i.toLowerCase()))
  const addCompound = (i: any) => i.governanceID?.filter((j: any) => j.startsWith('compound:')).forEach((j: any) => compoundIds.add(j.toLowerCase()))
  getGovernanceSources().map(addCompound)
  return [...compoundIds].map(i => i.replace('compound:', ''))
}

export async function updateCompounds() {
  const overview: any = await getCompoundOverview()
  const compoundIds = getCompoundIds(Object.keys(overview))
  // const compoundIds = ['ethereum:0x408ed6354d4973f66138c91495f2f2fcbd8724c3']
  console.log('compound gov#', compoundIds.length)
  const idChunks = sliceIntoChunks(compoundIds, 8)

  for (const ids of idChunks) {
    await Promise.all(ids.map(updateCache))
  }

  return setCompoundOverview(overview)

  async function updateCache(id: string) {

    const [chain, address] = id.split(':')
    const cache = await getCompound(id)
    if (!cache.metadata) cache.metadata = { id, chain, address }
    if (!cache.proposals) cache.proposals = {}
    const timestamp = Math.floor(Date.now() / 1e3)
    const api = new sdk.ChainApi({ chain, timestamp, })
    cache.id = id
    const provider = getProvider(chain)

    try {
      await updateMetadata()
      cache.metadata.network = '' + api.chainId
      cache.metadata.chainName = getChainNameFromId(cache.metadata.network)
      const logMap = await getProposalLogs()

      const missingIds: string[] = []

      Object.keys(logMap).forEach((id: string) => {
        const proposal = cache.proposals[id]
        if (!proposal) {
          missingIds.push(id)
        } else {
          const isProposalClosed = ['Canceled', 'Defeated', 'Expired', 'Executed'].includes(proposal.state)
          if (!isProposalClosed)
            missingIds.push(id)
        }
      })

      await updateProposals(missingIds)

      cache.metadata.proposalsCount = Object.values(cache.proposals).length
      updateStats(cache, overview, cache.id)
      return setCompound(cache.id, cache)


      // function isInvalidProposal(prop: CompoundProposal) {
      //   return prop.eta === 0 && prop.startBlock === 0 && prop.endBlock === 0
      // }


      async function updateMetadata() {
        const metadata = cache.metadata
        const target = address
        let name = ''
        try {
          name = await api.call({ target, abi: 'string:name' })
        } catch (error) { }
        // const [name, ,] = await Promise.all([
        //   ,
        //   ,
        //   // api.call({ target, abi: 'string:symbol' }),
        //   // api.call({ target, abi: 'uint8:decimals' }),
        //   // api.call({ target, abi: 'uint256:proposalCount' }),
        // ])
        // sdk.log(target, name)
        metadata.name = name
        metadata.strategies = [
          {
            "name": "erc20-balance-of",
            "network": api.chainId,
            // "params": { symbol, address, decimals }
          }
        ]
        // metadata.symbol = symbol
        metadata.network = api.chainId
        metadata.quorumVotes = 0
      }

      async function updateProposals(ids: string[]) {
        let abi = proposalAbi

        if (address.toLowerCase() === '0x690e775361ad66d1c4a25d89da9fcd639f5198ed') {
          abi = radicleAbi
          cache.name = 'Radicle Governor'
          cache.metadata.name = cache.name
        }

        if (ids.length) {

          // If not V2, maybe it is V1
          try {
            const quorumVotes = await api.call({ target: address, abi: 'uint256:quorumVotes' })
            cache.metadata.quorumVotes = +quorumVotes
          } catch (error) {
            abi = proposalAbiV1
          }


          // Maybe it is Nouns
          try {
            await api.call({ abi, target: address, params: ids[0] })
          } catch (error) {
            abi = proposalAbiNouns
          }

          // Maybe it is quirky V2
          try {
            await api.call({ abi, target: address, params: ids[0] })
          } catch (e) {
            sdk.log('Failed to get proposal data, trying abiV2 alternative for:', cache.metadata.name)
            abi = proposalAbi2
          }

          try {
            await api.call({ abi, target: address, params: ids[0] })
          } catch (error) {
            sdk.log('I give up', id, cache.metadata.name)
            throw error
          }
        }

        let proposalData = await api.multiCall({ abi, target: address, calls: ids })
        let states = await api.multiCall({ abi: 'function state(uint256) view returns (uint8)', target: address, calls: ids })
        states.forEach((state, i) => proposalData[i].state = PROPOSAL_STATES[state])
        return Promise.all(ids.map((v, i) => updateProposal(v, proposalData[i])))
      }

      async function updateProposal(id: string, data: any) {
        const {
          startBlock = +logMap[id].startBlock,
          endBlock = +logMap[id].endBlock,
          proposer = logMap[id].proposer,
          forVotes,
          againstVotes,
          abstainVotes = 0,
          canceled,
          executed,
          eta = 0,
          state,
        } = data
        let start = 0
        let end = 0
        if (startBlock !== 0)
          start = (await provider.getBlock(toHex(startBlock)))?.timestamp

        if (endBlock !== 0)
          end = (await provider.getBlock(toHex(endBlock)))?.timestamp

        const scores = [+forVotes, +againstVotes, +abstainVotes,]
        const scores_total = scores.reduce((acc, i) => acc + i, 0)

        // let state = 'Active'
        // if (executed || end < timestamp) state = 'Closed'
        // else if (canceled) state = 'Rejected'
        // else if (+forVotes > +againstVotes && scores_total > cache.metadata.quorumVotes) state = 'Queued'

        const description = (logMap[id].description ?? '').trim()
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

        // proposal.isInvalid = isInvalidProposal(proposal)
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
        // For v1, take start block and end block from HeadBucketRequestFilterSensitiveLog, use the getVotes and getState call to fetch the rest: https://etherscan.io/address/0x8869a94df9200c75116a285e12e85c24179129e1#readProxyContract 
        logs.forEach(({ id, description, startBlock, endBlock, proposer, }: any) => {
          logMap['' + id] = { description, startBlock, endBlock, proposer, }
        })
        sdk.log(cache.metadata.name, 'fetched logs#', logs.length)
        return logMap
      }
    } catch (e) {
      console.log(`
        ---------------
        ######### ERROR: failed for Id: ${id} Name: ${cache.metadata.name}
      `)
      console.error(e)
      console.log(`      ---------------      `)
    }
  }
}

const proposalAbiV1 = "function proposalVotes(uint256) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)"
const proposalAbi = "function proposals(uint256) view returns (uint256 id, address proposer, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool executed)"
const proposalAbi2 = "function proposals(uint256) view returns (uint256 id, address proposer, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, bool canceled, bool executed)"
const radicleAbi = "function proposals(uint256) view returns (address proposer, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, bool canceled, bool executed)"
const proposalAbiNouns = "function proposals(uint256 proposalId) view returns (tuple(uint256 id, address proposer, uint256 proposalThreshold, uint256 quorumVotes, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool vetoed, bool executed, uint256 totalSupply, uint256 creationBlock))"
