import { getCompound, setCompound, getCompoundOverview, setCompoundOverview, } from './cache'
import { CompoundProposal, } from './types'
import { getLogs, } from './getLogs'
import { updateStats, toHex, getGovernanceSources, getChainNameFromId } from './utils'
import * as sdk from '@defillama/sdk'
import { sliceIntoChunks } from '@defillama/sdk/build/util/index'
import { getProvider } from '@defillama/sdk/build/general'
import { NNS_GOV_ID, addICPProposals } from './icp/nns'
import { SNS_GOV_ID, addSNSProposals } from './icp/sns'
import { addTaggrProposals } from './icp/taggr'

const PROPOSAL_STATES = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed']

// these are moved to tally
const blacklisted = [
  'icp',
  'rrkah-fqaaa-aaaaa-aaaaq-cai',
  'ethereum:0x6f3e6272a167e8accb32072d08e0957f9c79223d',
  "ethereum:0x6853f8865ba8e9fbd9c8cce3155ce5023fb7eeb0",
  "ethereum:0xda9c9ed96f6d42f7e74f3c7eea6772d64ed84bdf",
  "ethereum:0x3d5fc645320be0a085a32885f078f7121e5e5375",
  "ethereum:0x2256b25cfc8e35c3135664fd03e77595042fe31b",
  "ethereum:0x7a6bbe7fdd793cc9ab7e0fc33605fcd2d19371e8",
  "ethereum:0x91d9c2b5cf81d55a5f2ecc0fc84e62f9cd2cefd6",
  "ethereum:0xc0da02939e1441f497fd74f78ce7decb17b66529",
  "ethereum:0x5afedef1454cdd11d4705c06aa4d66aa396343f6",
  "ethereum:0x6552c8fb228f7776fc0e4056aa217c139d4bada1",
  "ethereum:0x2da253835967d6e721c6c077157f9c9742934aea",
  "ethereum:0xdbd38f7e739709fe5bfae6cc8ef67c3820830e0c",
  "ethereum:0x0c54629266d7fa40b4bfaf1640ebc2cd093866c3",
  "ethereum:0x35d9f4953748b318f18c30634ba299b237eedfff",
  "ethereum:0x3133b4f4dcffc083724435784fefad510fa659c6",
  "ethereum:0xa89163f7b2d68a8fba6ca36beed32bd4f3eeaf61",
  "ethereum:0x95129751769f99cc39824a0793ef4933dd8bb74b",
  "ethereum:0xb3a87172f555ae2a2ab79be60b336d2f7d0187f0",
  "ethereum:0x323a76393544d5ecca80cd6ef2a560c6a395b7e3",
  "ethereum:0x408ed6354d4973f66138c91495f2f2fcbd8724c3",
  "ethereum:0x0bef27feb58e857046d630b2c03dfb7bae567494",
]

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
]

missing.forEach((i: any) => blacklisted.push('ethereum:' + i.split(':')[2].toLowerCase()))

export function getCompoundIds(existingIds: string[]) {
  let compoundIds = new Set(existingIds.map(i => i.toLowerCase()))
  const addCompound = (i: any) => i.governanceID?.filter((j: any) => j.startsWith('compound:')).forEach((j: any) => compoundIds.add(j.toLowerCase()))
  getGovernanceSources().map(addCompound)
  return [...compoundIds].map(i => i.replace('compound:', ''))
}

export async function updateCompounds() {
  const overview: any = await getCompoundOverview()

  blacklisted.forEach((i: any) => delete overview[i])
  const compoundIds = getCompoundIds(Object.keys(overview))
  // const compoundIds = ['ethereum:0x408ed6354d4973f66138c91495f2f2fcbd8724c3']
  const idChunks = sliceIntoChunks(compoundIds, 8)

  for (const ids of idChunks) {
    await Promise.all(ids.map(updateCache))
  }

  await addSNSProposals(overview)
  await addICPProposals(overview)
  await addTaggrProposals(overview)
  await setCompoundOverview(overview)

  async function updateCache(id: string) {
    if (id === NNS_GOV_ID) return;
    if (id.startsWith(SNS_GOV_ID)) return;

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
      fixDecimals()
      updateStats(cache, overview, cache.id)
      return setCompound(cache.id, cache)

      async function updateMetadata() {
        const metadata = cache.metadata
        const target = address
        let name = ''
        try {
          name = await api.call({ target, abi: 'string:name' })
        } catch (error) { }

        metadata.name = name
        metadata.strategies = [
          {
            "name": "erc20-balance-of",
            "network": api.chainId,
          }
        ]
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
          startBlock = Number(logMap[id].startBlock),
          endBlock = Number(logMap[id].endBlock),
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
          start = (await provider.getBlock(toHex(startBlock)))?.timestamp ?? 0

        if (endBlock !== 0)
          end = (await provider.getBlock(toHex(endBlock)))?.timestamp ?? 0

        const scores = [+forVotes, +againstVotes, +abstainVotes,]
        const scores_total = scores.reduce((acc, i) => acc + i, 0)

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
          quorum: cache.metadata.quorumVotes ?? 0,
          votes: 0,
          score_skew: 0,
          score_curve: 0,
          score_curve2: 0,
        }

        cache.proposals[id] = proposal
      }

      async function getProposalLogs() {
        const fromBlocks: any = {
          ethereum: 12006099, // the deployment block of compound
          rsk: 3100000, // the deployment block of sovryn
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

      function fixDecimals() {
        let divider = 1e18

        if (["ethereum:0x6f3e6272a167e8accb32072d08e0957f9c79223d",
          "ethereum:0x5e5031627408fc2a75c8560f9c84548c1de6fe37",
          "ethereum:0x0b901d47cbe666de867a6d6f1b54939e71c5f649",
          "ethereum:0x1a1b5bdd78817cd8fe22e0491c347ee076f27215",
          "ethereum:0x80bae65e9d56498c7651c34cfb37e2f417c4a703",
          "ethereum:0xdbd38f7e739709fe5bfae6cc8ef67c3820830e0c",
          "ethereum:0xcdb9f8f9be143b7c72480185459ab9720462a786",].includes(cache.id)) {
          divider = 1
        } else if (["ethereum:0xda9c9ed96f6d42f7e74f3c7eea6772d64ed84bdf"].includes(cache.id)) {
          divider = 1e8
        }

        Object.values(cache.proposals).forEach((i: any) => {
          if (i.scores_total > divider) {
            i.scores = i.scores.map((j: any) => j / divider)
            i.scores_total /= divider
            i.quorum /= divider
          }
        })
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
