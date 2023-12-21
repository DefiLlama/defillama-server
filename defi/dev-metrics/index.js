const { Octokit } = require('octokit')
const { setOrgDataFile, getOrgDataFile, clearTempFolders } = require('./utils/cache')
const { ORG_MAPPING } = require('./utils')
const { pullOrCloneRepository } = require('./utils/git')
const sdk = require('@defillama/sdk')
const { blacklistedOrgs, users, blacklistedRepoMapping } = require('./config')
const { GITHUB_API_KEY } = require('./env')

clearTempFolders()
const gitOrgs = [...new Set(Object.values(ORG_MAPPING).map(i => i.github).flat())]
// const gitOrgs = ['alpaca-finance']

sdk.log('Orgs', gitOrgs, gitOrgs.length)
const HOURS_12 = 12 * 60 * 60 * 1000
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000

const octokit = new Octokit({
  auth: GITHUB_API_KEY,
});

async function fetchOrgRepos(orgName, orgData, isUser) {
  const isFirstFech = !orgData.lastupdatetime
  if (orgData.lastupdatetime && (+new Date() - orgData.lastupdatetime) < THREE_DAYS) return;

  let pageLength = 99
  const repositories = []
  if (!isFirstFech) pageLength = 25
  let hasMorePages = false
  let page = 0
  do {
    sdk.log('Fetching repos for', orgName, page)
    const params = { per_page: pageLength, sort: 'pushed', page, direction: 'desc' }
    let method = 'listForOrg'
    if (!users.includes(orgName) && !isUser) {
      params.org = orgName
    } else {
      method = 'listForUser'
      params.username = orgName
      params.type = 'owner'
    }

    const { data } = await octokit.rest.repos[method](params)
    ++page
    repositories.push(...data)
    hasMorePages = data.length === pageLength
    if (!isFirstFech && hasMorePages) {
      const lastFetchedRepo = data[data.length - 1]
      hasMorePages = orgData.lastupdatetime < +new Date(lastFetchedRepo.pushed_at)
    }
    if (hasMorePages)
      sdk.log('Fetching more repos for', orgName, page)
  } while (hasMorePages)

  repositories.forEach(i => {
    i.id = '' + i.id
    const oldData = orgData.repos[i.id] ?? {}
    orgData.repos[i.id] = { ...oldData, ...i }
  })


}

async function main() {
  for (let org of gitOrgs) {
    try {

      if (blacklistedOrgs.includes(org)) continue;
      const isUser = org.startsWith('user:')
      org = org.replace(/^user:/, '')
      const orgData = getOrgDataFile(org)
      if (!orgData.repos) orgData.repos = {}
      await fetchOrgRepos(org, orgData, isUser)
      orgData.lastupdatetime = +new Date()
      setOrgDataFile(org, orgData)
      const blacklistedRepos = blacklistedRepoMapping[org] ?? []
      for (const repoData of Object.values(orgData.repos)) {
        if (blacklistedRepos.includes(repoData.name)) continue;
        await pullOrCloneRepository({ orgName: org, repoData, octokit, })
      }
    } catch (e) {
      console.error(e)
      console.log('Error pulling data for', org)
    }
  }
}

main()
  .catch(e => console.error(e))
  .then(() => {
    clearTempFolders()
    console.log('Exiting...')
  })