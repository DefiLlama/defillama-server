const simpleGit = require('simple-git');
const { getTempFolder, deleteFolder, getRepoLogFile, setRepoLogFile } = require('./cache')
const sdk = require('@defillama/sdk')
const path = require('path')

const HOURS_12 = 12 * 60 * 60 * 1000
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000
const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000

const progress = ({ method, stage, progress }) => {
  sdk.log(`git.${method} ${stage} stage ${progress}% complete`);
}

async function pullOrCloneRepository({ orgName, repoData, octokit, }) {
  const repoName = repoData.name
  if (repoData.fork || repoData.size === 0) return; // ignore forked repos

  try {
    const commitData = getRepoLogFile(orgName, repoName)
    if (commitData.lastupdatetime) {
      if (repoData.archived || repoData.disabled) return; // if repo is archived or disabled, dont look for new commits
      if (+new Date() > commitData.lastupdatetime - ONE_WEEK) return; // if repo was last updated under a week, dont look for new commits
      if (+new Date() - SIX_MONTHS > +new Date(repoData.pushed_at)) return; // if no new commits were pushed to repo in last 6 months, dont look for new commits

      let page = 0
      let hasMoreCommits = false
      let pageLength = 100

      do {
        sdk.log('Pulling commit logs from github for', orgName, repoName, page, commitData.lastupdatetimeStr)
        const { data: commits } = await octokit.rest.repos.listCommits({ owner: orgName, repo: repoName, per_page: pageLength, page, since: commitData.lastupdatetimeStr })
        if (!commits.length) break;
        hasMoreCommits = commits.length === pageLength
        let reachedCurrentCommit = false
        let isHeadCommit = true
        for (const { commit, sha, author, committer } of commits) {
          reachedCurrentCommit = sha === commitData.lastHash
          if (reachedCurrentCommit) {
            hasMoreCommits = false
            break;
          }

          const authorMeta = {
            name: commit.author.name.toLowerCase(),
            login: author.login,
            id: author.id,
            node_id: author.node_id,
            userType: author.type,
            site_admin: author.site_admin,
          }

          const committerMeta = {
            name: commit.committer.name.toLowerCase(),
            login: committer.login,
            id: committer.id,
            node_id: committer.node_id,
            userType: committer.type,
            site_admin: committer.site_admin,
          }

          const gitCommitData = { logType: 'github', data: { ...commit, authorMeta, committerMeta } }
          commitData.logs.push(gitCommitData)
          delete gitCommitData.data.verification
          if (!commitData.authorMap) commitData.authorMap = {}
          commitData.logs.filter(i => i.logType === 'github' && i.data.authorMeta).forEach(({ data: { authorMeta, committerMeta } }) => {
            updateAuthorMap(authorMeta)
            updateAuthorMap(committerMeta)
          })

          function updateAuthorMap({ name, userType }) {
            commitData.authorMap[name] = userType
          }

          if (isHeadCommit) {
            isHeadCommit = false
            commitData.lastHash = sha
            commitData.lastupdatetime = +new Date()
            commitData.lastupdatetimeStr = commit.committer.date
          }
        }

        sdk.log('[DONE] Pulled commit logs from github for', orgName, repoName, page, commitData.logs.length)
      } while (hasMoreCommits)
    } else {
      sdk.log('Cloning and pulled repo for ', orgName, repoName, repoData.size)

      // Fetching for the first time, pull the entire repo from github
      const repoPath = getTempFolder()

      let git = simpleGit(repoPath, repoName, { progress });
      await git.clone(repoData.html_url)
      git.cwd(path.join(repoPath, repoName))

      commitData.lastupdatetime = +new Date()
      const commitLogs = await git.log({ maxCount: 1e6 })
      commitData.logs = commitLogs.all.map(i => ({ logType: 'simple-git', data: i }))
      commitData.lastHash = commitLogs.latest.hash
      commitData.lastupdatetime = +new Date()
      commitData.lastupdatetimeStr = commitLogs.latest.date
      sdk.log('[DONE] Cloned and pulled repo for ', orgName, repoName, commitData.logs.length)
      deleteFolder(repoPath)
    }

    setRepoLogFile(orgName, repoName, commitData)
  } catch (error) {
    sdk.log('Error pulling/cloning repository:', orgName, repoData.name, error);
  }
}

module.exports = {
  pullOrCloneRepository
}