const fs = require('fs');
const { extractCommitsFromPushEvent } = require('../../utils')

const axios = require('axios');
const zlib = require('zlib');
const readline = require('readline');
let i = 0

const url = 'http://data.gharchive.org/2022-04-03-11.json.gz';

async function processJsonLineByLine(url) {
  // Download the file
  const response = await axios.get(url, { responseType: 'stream' })
  const allCommits = []

  // Create a readable stream for the downloaded file
  const fileStream = response.data.pipe(zlib.createGunzip());

  // Create an interface to read the file line by line
  const rl = readline.createInterface({    input: fileStream,    crlfDelay: Infinity,  });

  // Process each line of the file
  for await (const line of rl) {
    // Parse the JSON from each line
    const data = JSON.parse(line);
    ++i
    if (data.type !== 'PushEvent' || !data.payload.commits.length || data.actor.login.includes('[bot]') || data.actor.login.endsWith('-bot')) continue;
    allCommits.push(...extractCommitsFromPushEvent(data))
  }
  console.log(i, allCommits.length, allCommits.filter(i => i.authors.length > 1).length, allCommits.filter(i => !i.isMergeCommit).length)
  fs.writeFileSync(__dirname + '/../app-data/pullDataTest.json', JSON.stringify(allCommits, null, 2))
}

// Call the function with the URL of the json.tz file
processJsonLineByLine(url);
