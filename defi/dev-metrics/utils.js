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

function turnToElasticLog({log, repoData, orgName, projects, }) {
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


module.exports = {
  turnRawLogToMinimalLog,
  turnToElasticLog,
  ORG_MAPPING
}