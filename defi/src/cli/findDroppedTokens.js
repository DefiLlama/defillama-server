const axios = require('axios')
const _ = require('lodash')
const fs = require('fs')
const { PromisePool } = require('@supercharge/promise-pool')
const path = require('path')

// const rootDir = `${__dirname}/node_modules/dataTmp`
const cacheDir = `${__dirname}/node_modules/dataCache`

//  fs.rmdirSync(rootDir, { recursive: true, force: true })
//  fs.mkdirSync(rootDir)

async function run() {
  await updateCache()
  const jsonsInDir = fs.readdirSync(cacheDir).filter(file => path.extname(file) === '.json');

  const dataTable = []
  const missingTokenCount = {}
  jsonsInDir.forEach(file => {
    const fileData = fs.readFileSync(path.join(cacheDir, file))
    let data = JSON.parse(fileData.toString())
    const protocol = file.replace('.json', '')
    data = transform(data, protocol)
    if (!filterData(data, protocol)) return;
  });

  dataTable.sort((a, b) => b.tvlDiff - a.tvlDiff)
  const missingTokenTable = Object.entries(missingTokenCount)
  missingTokenTable.sort((a, b) => b[1] - a[1])

  console.table(dataTable)
  console.table(missingTokenTable)

  function transform(data, protocol) {
    // console.log('Transforming %s', protocol)
    delete data.chainTvls
    data.tvl = data.tvl.slice(-2)
    data.tokensInUsd = data.tokensInUsd.slice(-2)
    data.tokens = data.tokens.slice(-2)
    return data
  }

  function filterData(data, protocol) {
    const {
      tokens: [tyesterday, ttoday],
      tvl: [{ totalLiquidityUSD: tvlYes }, { totalLiquidityUSD: tvlNow }]
    } = data

    if (tvlYes < 1e3) return false; // too low to bother
    // we only care about tokens that exist
    if (Object.keys(tyesterday?.tokens || {}).length < 2) return false;
    // interested in tvl at least 10% less compared to yesterday
    const tvlDiff = Number((tvlYes - tvlNow) / tvlYes * 100).toFixed(2)
    if (tvlDiff < 5) return false;

    const tokenKeys = Object.keys(ttoday.tokens)
    const tokenKeysYes = Object.keys(tyesterday.tokens)

    // only if there is no change in tokens
    // if (tokenKeys.length !== tokenKeysYes.length) return;
    const tokenIntersection = _.intersection(tokenKeys, tokenKeysYes)
    if (tokenIntersection.length === tokenKeysYes.length) return;

    if (protocol === '1inch Network') return;
    const missingTokens = _.difference(tokenKeysYes, tokenIntersection)

    dataTable.push({
      protocol,
      tvlDiff,
      // tokenKeys: Object.keys(ttoday.tokens).filter(i => !i.startsWith('UNKNOWN')).join(', ').slice(0, 30),
      chains: Object.keys(data.currentChainTvls).join(', ').slice(0, 20),
      'tvl (day ago)': Number(tvlYes / 1e6).toFixed(2),
      'tvl (now)': Number(tvlNow / 1e6).toFixed(2),
      tokenDiff: missingTokens.join(', '),
    })

    missingTokens.forEach(t => {
      if (!missingTokenCount[t]) missingTokenCount[t] = 0
      missingTokenCount[t] += 1
    })

    return true
  }
}

async function updateCache() {

  const { data: protocols } = await axios.get('https://api.llama.fi/protocols')
  let i = 0

  const { errors } = await PromisePool
    .withConcurrency(100)
    .for(protocols.map(i => i.name))
    .process(async (protocol) => {
      const { data } = await axios.get(`https://api.llama.fi/protocol/${protocol.replaceAll(' ', '-').replaceAll('\'', '')}`)
      ++i
      addFile(protocol, data)
    })

  if (errors.length)
    console.log(errors)



  async function addFile(protocol, data) {
    if (i % 100) console.log('fetched %s (%s of %s), interesting #%s', protocol, i, protocols.length)
    fs.writeFileSync(`${cacheDir}/${protocol}.json`, JSON.stringify(data, null, 2))
  }
}

run().then(_ => 'All done!')
