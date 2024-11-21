const sdk = require('@defillama/sdk')
const simpleGit = require('simple-git')
const fs = require('fs')
const cache = require('../utils/cache')
const { setTomlFile } = require('../utils/r2')

const path = require('path');
const toml = require('@iarna/toml');
let orgData = []
let allOrgData = []
let repoOrgs = []
const repoTags = {}
const repos = {}
const ecosystemData = {}

cache.clearTempFolders()
const repoDir = cache.getTempFolder()
const git = simpleGit(repoDir)
const repoUrl = 'https://github.com/electric-capital/crypto-ecosystems.git'
const orgSet = new Set()

function consolidateOrgData(title) {
  if (!orgSet.has(title)) 
    orgSet.add(title)
  else {
    // console.log('Duplicate org', title)
    return;
  }

  const data = ecosystemData[title]
  const { sub_ecosystems } = data
  if (!sub_ecosystems.length) return
  sub_ecosystems.forEach(subEco => {
    consolidateOrgData(subEco)
    const { orgs } = ecosystemData[subEco]
    data.orgs.push(...orgs)
    orgData.push(...orgs)
  })
  data.orgs = getUnique(data.orgs)
}

async function cloneRepo() {
  await git.clone(repoUrl, repoDir, { '--depth': 1 })
  // git.cwd(path.join(repoPath, 'crypto-ecosystems'))
  sdk.log('Cloned repo')
  crawlAndParseTomlFiles(path.join(repoDir, 'data', 'ecosystems'))
  sdk.log('Parsed TOML files')
  Object.keys(ecosystemData).forEach(consolidateOrgData)
  Object.keys(ecosystemData).forEach(i => i.orgs = getUnique(i.orgs))
  orgData = getUnique(orgData)
  repoOrgs = new Set(repoOrgs)
  orgData.forEach(org => repoOrgs.delete(org))
  repoOrgs = Array.from(repoOrgs)
  allOrgData = getUnique(allOrgData)
  sdk.log({ orgCount: orgData.length, reposCount: Object.keys(repos).length, ecoCount: Object.keys(ecosystemData).length, repoOrgsCount: repoOrgs.length, allOrgsCount: allOrgData.length })
  Object.keys(repos).forEach(repo => {
    const [org, name] = repo.split('/')
    if (orgData.includes(org)) {
      delete repos[repo]
    }
  })
  sdk.log(orgData.length, Object.keys(repos).length, Object.keys(ecosystemData).length)
  const tomlFile = { orgData, repos, ecosystemData }
  await setTomlFile(tomlFile)
  cache.writeJSON('tomlData.json', tomlFile, { compressed: false })
}

let i = 0
function crawlAndParseTomlFiles(folderPath) {
  const files = fs.readdirSync(folderPath);

  files.forEach((file) => {
    const fullPath = path.join(folderPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      crawlAndParseTomlFiles(fullPath);
    } else if (path.extname(file) === '.toml') {
      // If it's a TOML file, read and parse its contents
      let fileData = fs.readFileSync(fullPath, 'utf8');
      let { title, sub_ecosystems = [], github_organizations = [], repo = [] } = toml.parse(fileData)
      // sdk.log('parsed', file, ++i)
      const data = {
        title,
        sub_ecosystems,
        orgs: github_organizations.filter(i => i.startsWith('https://github.com/')).map(i => i.replace('https://github.com/', '')),
        // orgsOrig: github_organizations,
      }
      repo.filter(i => i.url?.startsWith('https://github.com/')).map(i => {
        // i.url = i.url.replace('https://github.com/', '')
        const repoName = i.url.replace('https://github.com/', '')

        const [org] = repoName.split('/')
        repoOrgs.push(org)
        allOrgData.push(org)
        if (repos[repoName]) {
          repos[repoName].tags = getUnique([...(repos[repoName].tags ?? []), ...(i.tags ?? [])])
          if (repos[repoName].tags.length === 0) delete repos[repoName].tags
        } else {
          repos[repoName] = i
        }
        // if (i.tags) repoTags[i.url] = i.tags
        return i
      })
      data.orgs = getUnique(data.orgs)
      ecosystemData[title] = data
    }
  });
}

cloneRepo()

function getUnique(arry) {
  return [...new Set(arry)]
}