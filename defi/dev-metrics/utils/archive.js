const sdk = require('@defillama/sdk')
const axios = require('axios');
const zlib = require('zlib');
const readline = require('readline');
const { PromisePool } = require('@supercharge/promise-pool')
const { extractCommitsFromPushEvent } = require('./index')
const { GitCommitRaw, addRawCommits, } = require('../db')
const { Op } = require('sequelize');

const { addArchiveData, addRawCommit, archiveExists } = require('../db')

const getUrl = (date) => `http://data.gharchive.org/${date}.json.gz`

async function getRawCommits(archiveFile) {
  const url = getUrl(archiveFile)
  let i = 0
  // Download the file
  const response = await axios.get(url, { responseType: 'stream' })
  const rawCommits = []

  // Create a readable stream for the downloaded file
  const fileStream = response.data.pipe(zlib.createGunzip());

  // Create an interface to read the file line by line
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity, });

  // Process each line of the file
  for await (const line of rl) {
    // Parse the JSON from each line
    const data = JSON.parse(line);
    ++i
    if (data.type !== 'PushEvent' || !data.payload.commits.length || data.actor.login.includes('[bot]') || data.actor.login.endsWith('-bot')) continue;
    rawCommits.push(...extractCommitsFromPushEvent(data))
  }

  return { rawCommits, commit_count: i, filtered_commit_count: rawCommits.length, archive_file: archiveFile }
}

const missingArchives = [
]

async function addArchive(archive_file, fileNumber = { i: 0 }) {
  const { i, startTimestamp, totalHours, checked } = fileNumber
  if (missingArchives.includes(archive_file)) return;
  if (await archiveExists(archive_file)) {
    // sdk.log('Archive already exists, skipping: ', archive_file)
    return
  }
  const startTime = Date.now()
  const { rawCommits, commit_count, filtered_commit_count } = await getRawCommits(archive_file)
  await addRawCommits(rawCommits)
  /* const existingCommits = await GitCommitRaw.findAll({
    where: {
      sha: {
        [Op.in]: rawCommits.map(c => c.sha),
      },
    },
  })
  console.log('existing commits', existingCommits.length)
  const existingCommitHashes = new Set(existingCommits.map(c => c.sha))
  const missingCommits = rawCommits.filter(c => !existingCommitHashes.has(c.sha))
  await GitCommitRaw.bulkCreate(missingCommits) */
/* 

  const { errors } = await PromisePool.withConcurrency(120)
    .for(rawCommits)
    .process(addRawCommit)

  if (errors && errors.length)
    throw errors[0]
 */
  await addArchiveData(archive_file, commit_count, filtered_commit_count)
  const timeTaken = Number((Date.now() - startTime) / 1000).toPrecision(3)
  const avgTimeTaken = Number((Date.now() - startTimestamp) / (1000 * i)).toPrecision(3)
  const progress = Number(100 * checked / totalHours).toPrecision(5)
  sdk.log(`${fileNumber.i++} Added ${filtered_commit_count} / ${commit_count} to archive ${archive_file} | time taken: ${timeTaken}s | avg: ${avgTimeTaken}s | progress: ${progress}% (${checked}/${totalHours})`)
}

module.exports = {
  getRawCommits,
  addArchive,
}