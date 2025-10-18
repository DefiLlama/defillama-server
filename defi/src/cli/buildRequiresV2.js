const axios = require('axios');
const fs = require('fs');

const tvlAdaptersFile = __dirname + "/../utils/imports/tvlAdapterData.json"
const dimensionsFile = __dirname + "/../utils/imports/dimensions_adapters.json"
const tvlSource = 'https://github.com/DefiLlama/DefiLlama-Adapters/releases/download/latest/tvlModules.json'
const dimensionsSource = 'https://github.com/DefiLlama/dimension-adapters/releases/download/latest/dimensionModules.json'

async function run() {
  await Promise.all([
    download(tvlSource, tvlAdaptersFile),
    download(dimensionsSource, dimensionsFile),
  ])
}

async function download(url, filePath) {
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream'
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on('finish', resolve);
    writer.on('error', reject);
    response.data.on('error', reject);
  });
}

run().catch(console.error).then(() => process.exit(0))