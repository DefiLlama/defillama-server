const moment = require('moment')
let ORG_MAPPING = {}
let TWITTER_MAPPING = {}
let tomlData = { orgData: [], repos: {}, ecosystemData: {} }  // Default values

const ORGS_MISSING_FROM_TOML = []

try {
  ORG_MAPPING = require('../app-data/mapping.json')
  TWITTER_MAPPING = require('../app-data/twitter_mapping.json')
  tomlData = require('../app-data/tomlData.json')
} catch (e) {
  console.error(e)
}

const orgSet = new Set(tomlData.orgData?.map(i => i.replace(/\/$/, '')))
const repoSet = new Set(Object.keys(tomlData.repos || {}))
Object.values(ORG_MAPPING).forEach(org => {
  let github = org.github
  if (typeof github === 'string') github = [github]
  github.map(i => i.replace('user:', i).replace(/\/$/, '')).forEach(i => {
    if (orgSet.has(i)) return;
    ORGS_MISSING_FROM_TOML.push(i)
    orgSet.add(i)
  })
})
// Object.keys(tomlData.repos).forEach(org => orgSet.add(org.split('/')[1]))  // Add orgs from repos in tomlData.json

function toUnixTime(dateStr) {
  return Math.floor(new Date(dateStr) / 1e3)
}

function turnRawLogToMinimalLog(log) {
  const { data, logType } = log
  const minimalLog = {}
  minimalLog.message = data.message
  switch (logType) {
    case 'simple-git':
      minimalLog.hash = data.hash
      minimalLog.time = data.date
      minimalLog.authors = getAuthorsFromCommit(data.author_name, data.body)
      break;
    case 'github':
      minimalLog.hash = data.tree.sha
      minimalLog.time = data.author.date
      minimalLog.authors = getAuthorsFromCommit(data.author.name, data.message)
      break;
    default: throw new Error('Log missing log type' + JSON.stringify(log))
  }
  return minimalLog
}

function turnToElasticLog({ log, repoData, orgName, projects, }) {
  log = turnRawLogToMinimalLog(log)
  log['@timestamp'] = log.time
  delete log.time
  log.metadata = {
    org: orgName,
    repo: repoData.name,
    language: repoData.language,
    topics: repoData.topics,
    projects,
  }
  return log
}

function getAuthorsFromCommit(authorName, commitMessage = '') {
  const authorSet = new Set()
  authorSet.add(authorName.toLowerCase())
  const regex = /Co-authored-by:\s*(.*?)\s*</;

  commitMessage.split('\n').forEach(str => {
    const match = regex.exec(str);
    const name = match ? match[1] : null
    if (name)
      authorSet.add(name.toLowerCase())
  })
  return [...authorSet]
}

const coAuthorRegex = /Co-authored-by:\s+([^<]+)\s+<([^>]+)>/gi;

function filterCommit(commit) {
  const botRegex = /\b(bot)\b/i
  const { authors, } = commit
  return !authors.some(i => botRegex.test(i.name) || botRegex.test(i.email) || i.email.endsWith('@github.com'))
}

function extractCommitsFromPushEvent(pushEvent) {
  const { repo, payload, org, created_at, } = pushEvent
  const { commits } = payload

  const owner = org?.login || repo.name.split('/')[0]
  return commits.filter(preFilterCommit).map(extractCommit).filter(filterCommit)

  function preFilterCommit(commit) {
    // return orgSet.has(owner)
    return commit.distinct && (orgSet.has(owner) || repoSet.has(repo.name))
  }

  function extractCommit(commit) {
    const { author, message, sha } = commit
    const { email, name } = author
    const authorObj = {}
    authorObj[name] = email


    const authors = [];
    let matches;

    while ((matches = coAuthorRegex.exec(message))) {
      const coAuthorName = matches[1].trim()
      const coAuthorEmail = matches[2].trim()
      authorObj[coAuthorName] = coAuthorEmail
    }

    for (const [name, email] of Object.entries(authorObj))
      authors.push({ name, email })

    return {
      sha,
      message: truncMessage(message),
      authors,
      repo: repo.name,
      owner,
      is_merge_commit: message.includes('Merge pull request') || message.includes('Merge branch'),
      is_processed: false,
      created_at,
    }
  }

}

function extractCommitsFromSimpleGit(commits, repoData) {
  const owner = repoData.full_name.split('/')[0]
  return commits.map(extractCommit)

  function extractCommit(commit) {
    let { author_email: email, author_name: name, message, body, hash: sha, date } = commit
    const authorObj = {}
    authorObj[name] = email
    if (body && body.length > 0) message += '\n' + body
    const created_at = moment.utc(date).format()

    const authors = [];
    let matches;

    while ((matches = coAuthorRegex.exec(message))) {
      const coAuthorName = matches[1].trim()
      const coAuthorEmail = matches[2].trim()
      authorObj[coAuthorName] = coAuthorEmail
    }

    for (const [name, email] of Object.entries(authorObj))
      authors.push({ name, email })

    return {
      sha,
      message: truncMessage(message),
      authors,
      repo: repoData.full_name,
      owner,
      is_merge_commit: message.includes('Merge pull request') || message.includes('Merge branch'),
      is_processed: false,
      created_at,
    }
  }

}

function truncMessage(message) {
  const maxLength = 420
  if (typeof message === 'string' && message.length > maxLength) {
    message = message.substring(0, maxLength - 3) + '...'
  }
  return message
}

function sleepInMinutes(minutes) {
  const milliseconds = minutes * 60 * 1000; // Convert minutes to milliseconds

  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}


module.exports = {
  turnRawLogToMinimalLog,
  turnToElasticLog,
  extractCommitsFromPushEvent,
  ORG_MAPPING,
  ORGS_MISSING_FROM_TOML,
  TWITTER_MAPPING,
  orgSet,
  repoSet,
  sleepInMinutes,
  extractCommitsFromSimpleGit,
}