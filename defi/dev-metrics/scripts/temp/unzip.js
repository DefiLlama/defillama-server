const org = 'ethereum'
const repo = 'go-ethereum'



const cache = require('../cache')
const { turnToElasticLog } = require('../../utils')
const orgData = cache.getOrgDataFile(org)
const repoData = Object.values(orgData.repos).find(i => i.name === repo)
const logs = cache.getRepoLogFile(org, repo)
// const logsLog = cache.getRepoLogFile(org, repo, false)
const elasticLog = logs.logs.map(i => turnToElasticLog({log: i, repoData, orgName: org})).filter(i => !i.message.startsWith('Merge pull request #'))
console.log(logs.logs.length, elasticLog.length)
// console.log(logs)
cache.writeJSON('temp/org-'+org, orgData, { compressed: false })
cache.writeJSON('temp/repo-raw-'+repo, logs, { compressed: false })
// cache.writeJSON('temp/repo-'+repo, repoDataLog, { compressed: false })
cache.writeJSON('temp/repo-elastic-'+repo, elasticLog, { compressed: false })