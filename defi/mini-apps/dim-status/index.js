const http = require('http');
const fs = require('fs');
const path = require('path');
const sdk = require('@defillama/sdk')

const runTypes = [
  'fees', 'dexs', 'derivatives', 'aggregators', 'options',
  // 'rest',
  'open-interest',
]

const adapterTypes = [
  'fees', 'dexs', 'derivatives', 'aggregators', 'options', 'open-interest',
  'aggregator-derivatives', 'bridge-aggregators', 'normalized-volume',
]

async function genCache() {
  fs.mkdirSync(path.join(__dirname, '.cache'), { recursive: true });

  for (const runType of runTypes)
    await storeRunStats(runType)
  for (const adapterType of adapterTypes)
    await storeDimData(adapterType)
}

genCache()
setInterval(genCache, 15 * 60 * 1000) // refresh every 15 minutes


const port = process.env.PORT || 5001;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // Health check
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('OK');
  }

  // Config
  if (url.pathname === '/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ runTypes, adapterTypes }));
  }

  // Cache data by key
  if (url.pathname.startsWith('/cache/') && req.method === 'GET') {
    const key = url.pathname.slice('/cache/'.length);
    if (!key || key.includes('..') || key.includes('/')) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Invalid key');
    }
    const filePath = path.join(__dirname, '.cache', `${key}.json`);
    const stream = fs.createReadStream(filePath);
    stream.on('open', () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      stream.pipe(res);
    });
    stream.on('error', () => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });
    return;
  }

  // Serve frontend
  if (url.pathname === '/' && req.method === 'GET') {
    const filePath = path.join(__dirname, 'public', 'index.html');
    const stream = fs.createReadStream(filePath);
    stream.on('open', () => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      stream.pipe(res);
    });
    stream.on('error', () => {
      res.writeHead(500);
      res.end('Error loading page');
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(port, () => {
  console.log(`Dim status server started on port ${port}`);
  console.log(`Open http://localhost:${port} in your browser`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});

async function storeRunStats(statsKey) {
  try {
    const statsData = await sdk.cache.readCache(`dimensionRunStats-latest-${statsKey}`, {
      skipCompression: true,
      readFromR2Cache: true,
    })
    fs.writeFileSync(path.join(__dirname, '.cache', `run-data-${statsKey}.json`), JSON.stringify(statsData))
  } catch (error) {
    console.error(`Error storing run stats for ${statsKey}:`, error)
  }
}

async function storeDimData(adapterType) {
  try {
    const { protocols } = await sdk.cache.cachedFetch({ key: `dim-data-${adapterType}`, endpoint: `https://api.llama.fi/v2/metrics/${adapterType}` })
    const data = {}
    const interestedFields = ['id', 'name', 'total24h', 'total7d', 'total30d', 'totalAllTime', 'category', 'module']
    protocols.forEach(protocol => {
      data[protocol.name] = {}
      interestedFields.forEach(field => {
        data[protocol.name][field] = protocol[field]
      })
    })
    fs.writeFileSync(path.join(__dirname, '.cache', `dim-data-${adapterType}.json`), JSON.stringify(data))
  } catch (error) {
    console.error(`Error storing dim data for ${adapterType}:`, error)
  }
}