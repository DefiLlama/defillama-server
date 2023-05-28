const ORG_MAPPING = require('./app-data/mapping.json')

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
  const blacklistedEmails = new Set([
    'action@github.com',
    'github-actions@github.com',
    'actions@github.com',
  ])
  return !authors.some(i => botRegex.test(i.name) && botRegex.test(i.email) && !blacklistedEmails.has(i.email))
}

function extractCommitsFromPushEvent(pushEvent) {
  const { repo, payload, org, created_at, } = pushEvent
  const { commits } = payload

  return commits.map(extractCommit).filter(filterCommit)

  function extractCommit(commit) {
    const { author, distinct, message, sha } = commit
    const { email, name } = author
    const authorObj = {}
    authorObj[name] = email

    const [owner] = repo.name.split('/')

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
      distinct,
      message,
      authors,
      repo: repo.name,
      org: org?.login || owner,
      isMergeCommit: message.includes('Merge pull request') || message.includes('Merge branch'),
      created_at,
    }
  }

}

module.exports = {
  turnRawLogToMinimalLog,
  turnToElasticLog,
  extractCommitsFromPushEvent,
  ORG_MAPPING
}