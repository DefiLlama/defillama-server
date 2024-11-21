const { getOrgDataFile, getRepoLogFile, } = require('../cache')
const { ORG_MAPPING, turnToElasticLog } = require('../../utils')
const sdk = require('@defillama/sdk')
const { blacklistedOrgs, blacklistedRepoMapping } = require('../../config')

const { Client } = require('@elastic/elasticsearch')
const client = new Client({ node: 'http://localhost:9200' })
const reverseOrgMapping = {}

Object.entries(ORG_MAPPING).forEach(([projectId, { github }]) => {
  github.forEach(org => {
    if (!reverseOrgMapping[org]) reverseOrgMapping[org] = []
    reverseOrgMapping[org].push(projectId)
  })
})

const botUsers = new Set([
  'dependabot[bot]',
  'marge bot',
  'upptime bot',
  'mergify[bot]',
  'github actions',
  'klaytndocs',
])

async function main() {
  for (let org of Object.keys(reverseOrgMapping)) {
    try {

      if (blacklistedOrgs.includes(org)) continue;
      org = org.replace(/^user:/, '')
      const orgData = getOrgDataFile(org)
      if (!orgData.repos) orgData.repos = {}
      const blacklistedRepos = blacklistedRepoMapping[org] ?? []
      for (const repoData of Object.values(orgData.repos)) {
        if (blacklistedRepos.includes(repoData.name)) continue;
        if (repoData.fork || repoData.size === 0) continue; // ignore forked repos
        const commitData = getRepoLogFile(org, repoData.name)
        if (!commitData?.logs?.length) continue
        const indexName = `log-commits-${org}`.toLowerCase()
        // const createIndexRes = await client.indices.create({ index: indexName})
        // console.log(createIndexRes)
        const elasticLogs = commitData.logs
          .map(i => turnToElasticLog({ log: i, repoData, orgName: org, projects: reverseOrgMapping[org] }))
          .filter(i => !i.message.startsWith('Merge pull request #'))
        sdk.log(`Writing to ES for org: ${org} repo: ${repoData.name} #: ${elasticLogs.length}/${commitData.logs.length}`)
        const documents = elasticLogs.map(i => [{ create: { _id: i.hash, _index: indexName } }, i]).flat()
        const response = await client.bulk({ body: documents });
        // console.log(JSON.stringify(response, null, 2))

        if (response.errors) {
          console.log(JSON.stringify(response.items.filter(i => i.create.result !== 'created')[0], null, 2))
          throw new Error('Bulk write operation failed');

        }

      }
    } catch (e) {
      console.error(e)
      console.log('Error pushing data for', org)
    }
  }
}

main()
  .catch(e => console.error(e))
  .then(() => {
    console.log('Exiting...')
  })