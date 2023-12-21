const fs = require('fs');
const readline = require('readline');
let i = 0
const commitData = []
const mCommitData = []
const { extractCommitsFromPushEvent } = require('../utils')


function processLargeJSONFile(filePath) {
  const readableStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const lineReader = readline.createInterface({ input: readableStream });

  lineReader.on('line', (line) => {
    // Process each line of JSON data
    const data = JSON.parse(line);
    if (data.type !== 'PushEvent' || !data.payload.commits.length || data.actor.login.includes('[bot]') || data.actor.login.endsWith('-bot')) return;
    ++i
    mCommitData.push(...extractCommitsFromPushEvent(data))
    commitData.push(data)
  });

  lineReader.on('close', () => {
    fs.writeFileSync(__dirname + '/../app-data/commitData.json', JSON.stringify(commitData, null, 2))

    fs.writeFileSync(__dirname + '/../app-data/mcommitData.json', JSON.stringify(mCommitData, null, 2))
    fs.writeFileSync(__dirname + '/../app-data/mcommitData2.json', JSON.stringify(mCommitData.filter(i => i.authors.length > 1), null, 2))
    console.log('Processing complete', i, mCommitData.length, mCommitData.filter(i => i.authors.length > 1).length);
  });

  lineReader.on('error', (error) => {
    console.error('Error processing JSON file:', error);
  });
}

// Replace 'path/to/your/file.json' with the actual path to your JSON file
processLargeJSONFile(__dirname + '/../app-data/a.json');
