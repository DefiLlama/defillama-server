const { Octokit } = require('octokit')
const { setOrgDataFile, getOrgDataFile, clearTempFolders } = require('./cache')
const { pullOrCloneRepository } = require('./git')
const dataMapping = require('./app-data/mapping.json')
const sdk = require('@defillama/sdk')

clearTempFolders()
const gitOrgs = [...new Set(Object.values(dataMapping).map(i => i.github).flat())]
// const gitOrgs = ['alpaca-finance']

sdk.log('Orgs', gitOrgs, gitOrgs.length)
const HOURS_12 = 12 * 60 * 60 * 1000
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000

const octokit = new Octokit({
  auth: process.env.GITHUB_API_KEY,
});

async function fetchOrgRepos(orgName, orgData) {
  const isFirstFech = !orgData.lastUpdateTime
  if (orgData.lastUpdateTime && (+new Date() - orgData.lastUpdateTime) < THREE_DAYS) return;

  let pageLength = 99
  const repositories = []
  if (!isFirstFech) pageLength = 25
  let hasMorePages = false
  let page = 0
  do {
    sdk.log('Fetching repos for', orgName, page)
    const { data } = await octokit.rest.repos.listForOrg({ org: orgName, per_page: pageLength, sort: 'pushed', page })
    ++page
    repositories.push(...data)
    hasMorePages = data.length === pageLength
    if (!isFirstFech && hasMorePages) {
      const lastFetchedRepo = data[data.length - 1]
      hasMorePages = orgData.lastUpdateTime < +new Date(lastFetchedRepo.pushed_at)
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
  for (const org of gitOrgs) {
    const orgData = getOrgDataFile(org)
    if (!orgData.repos) orgData.repos = {}
    await fetchOrgRepos(org, orgData)
    orgData.lastUpdateTime = +new Date()
    setOrgDataFile(org, orgData)
    for (const repoData of Object.values(orgData.repos)) {
      await pullOrCloneRepository({ orgName: org, repoData, octokit, })
    }
  }
}

main()
  .catch(e => console.error(e))
  .then(() => {
    clearTempFolders
    console.log('Exiting...')
  })