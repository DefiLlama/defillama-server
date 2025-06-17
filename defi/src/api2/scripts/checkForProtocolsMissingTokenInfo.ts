
import '../utils/failOnError'
import { sendMessage } from "../../utils/discord";
import * as sdk from '@defillama/sdk';
import { sliceIntoChunks } from "@defillama/sdk/build/util";
import axios from 'axios';
import protocols from '../../protocols/data'
import parentProtocols, { parentProtocolsById } from "../../protocols/parentProtocols";
import { tableToString } from '../utils';
import { addCGTokenMetadatas, addCMCTokenMetadatas, getAllCGTokenMetadata, getAllCMCTokenMetadata } from '../../../dev-metrics/db';
import { IProtocol } from '../../types';
import { chainCoingeckoIds } from '../../utils/normalizeChain';
import fs from 'fs';
import sleep from '../../utils/shared/sleep';
const chains = Object.entries(chainCoingeckoIds).map(([chain, id]: any) => {
  return {
    ...id,
    category: 'chain-listing',
    name: `${chain} (chain)`,
    id: `${chain} (chain)`,
  }
})

const allMetadata = protocols.concat(parentProtocols as IProtocol[], chains)

/* const descriptionMap: any = {}
const tableData: any = []
protocols.forEach((protocol: any) => {
  if (protocol.description) {
    if (descriptionMap[protocol.description]) {
      tableData.push([protocol.description.slice(0, 100), protocol.name, descriptionMap[protocol.description]])
      return;
    }
    descriptionMap[protocol.description] = protocol.name
  }
})

console.table(tableData)
 */

let processedParentProtocols = new Set<string>()

const sortTableData = (a: any, b: any) => {
  if (a.category === 'chain-listing') return -1; // Chain listings should come first
  if (b.category === 'chain-listing') return 1; // Chain listings should come first
  if (a.domainK < b.domainK) return -1;
  if (a.domainK > b.domainK) return 1;
  if (a.twitterK < b.twitterK) return -1;
  if (a.twitterK > b.twitterK) return 1;
  return 0;
}



async function _main() {
  let compTestFile = 'cmc-cache-test'
  let normalTestFile = 'cmc-cache-skip-compression-test'
  // compressed read time
  // let compressedReadTimeStart = Date.now()
  // const compCache = await sdk.cache.readCache(cacheFile, { skipR2Cache: true})
  // let compressedReadTime = Date.now() - compressedReadTimeStart

  // console.log('Compressed cache read time:', compressedReadTime, 'ms');
  // let compWriteStart = Date.now()
  // await sdk.cache.writeCache(compTestFile, compCache, {skipR2CacheWrite: true, })
  // let compWriteTime = Date.now() - compWriteStart

  // console.log('Compressed cache write time:', compWriteTime, 'ms');
  // let normalWriteStart = Date.now()
  // await sdk.cache.writeCache(normalTestFile, JSON.stringify({llamaWrapped: compCache}), { alreadyCompressed: true, skipR2CacheWrite: true })
  // let normalWriteTime = Date.now() - normalWriteStart

  // console.log('Normal cache write time:', normalWriteTime, 'ms');

  let normalReadStart = Date.now()
  const normalCache = await sdk.cache.readCache(normalTestFile, { skipR2Cache: true })
  console.log('Normal cache read', typeof normalCache, typeof normalCache === 'string' ? normalCache.slice(0, 100) : Object.keys(normalCache));
  let normalReadTime = Date.now() - normalReadStart
  console.log('Normal cache read time:', normalReadTime, 'ms');
  // console.log('Compressed cache is', compressedReadTime < normalReadTime ? 'faster' : 'slower', 'than normal cache read');
  // console.log('Compressed cache is', compWriteTime < normalWriteTime ? 'faster' : 'slower', 'than normal cache write');
  console.log(normalCache.lastUpdated)
}

async function getCMCMetadatas() {

  const axiosInstance = axios.create({
    baseURL: "https://pro-api.coinmarketcap.com",
    headers: {
      'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
    }
  });
  const metadataMap: any = await getAllCMCTokenMetadata();
  let { data: { data: coinMap } } = await axiosInstance.get('/v1/cryptocurrency/map')
  console.log('Fetched coin map from CoinMarketCap', coinMap.length, 'coins');
  coinMap = coinMap.filter((coin: any) => coin.platform && coin.is_active === 1 && new Date(coin.first_historical_data).getFullYear() >= 2022);
  coinMap.forEach((coin: any) => coin.id = '' + coin.id); // Ensure IDs are strings for consistency

  console.log('Filtered coin map to', coinMap.length, 'coins with platforms');
  const coinsMissingMetadata = coinMap.filter((coin: any) => !metadataMap[coin.id]);
  console.log('Coins missing metadata:', coinsMissingMetadata.length);
  const idChunks = sliceIntoChunks(coinsMissingMetadata, 99);
  console.log('Processing', idChunks.length, 'chunks of IDs');

  let i = 0
  for (const chunk of idChunks) {
    const coinIdMap: any = {}
    chunk.forEach((coin: any) => coinIdMap[coin.id] = coin)

    const { data: { data: metadataMap } } = await axiosInstance.get('/v1/cryptocurrency/info', {
      params: {
        id: chunk.map((coin: any) => coin.id).join(','),
        skip_invalid: true
      }
    });

    console.log(i++, 'Fetched metadata for chunk', chunk.length, 'coins', Object.keys(metadataMap).length, 'metadata entries found');

    for (const id of Object.keys(metadataMap)) {
      if (!coinIdMap[id]) {
        console.log(id, metadataMap[id])
        console.log('Coin ID not found in chunk:', id);
      } else coinIdMap[id].metadata = metadataMap[id]
    }

    chunk.forEach((coin: any) => {
      if (!coin.metadata) {
        console.log('No metadata for coin', coin.id, coin.name);
        coin.metadata = {}
        coin.missingMetadata = true
      }
      metadataMap[coin.id] = coin
    })

    console.log('Chunk processed, writing cmc metadata to db', chunk.length);
    await addCMCTokenMetadatas(chunk)


  }

  return metadataMap
}

const ignoredDomains = [
  'coinbase.com', 't.me', 'twitter.com', 'binance.com', 'dexscreener.com', 'kraken.com',
]


async function main() {


  const ignoredCoinsSet = new Set([
    '24165', '35459', '31370', '32882', '33903', '31369', '33834', '21583', '20641',
    '21882', '35458', '36175', '33312', '30141', '36068', '30907', '32194', '35437',
    '24760', '22318', '32690', '29256', '21540', '35293', '33310', '36067', '33652', '32689', '22880', '36289', '29599', '29242', '24875', '28910', '35670', '28909', '23773'
  ]);
  const hasCoinInfo = (protocol: any) => protocol.cmcId

  console.log('-----Fetching missing CoinMarketCap token link------')
  const existingCMCLinks = new Set(allMetadata.map((protocol: any) => protocol.cmcId).filter((id: any) => id));
  const existingDomainsWithCMCLinks = new Set(allMetadata.filter((protocol: any) => protocol.cmcId && protocol.url?.includes(('://'))).map((protocol: any) => getDomain(protocol.url!)))
  ignoredDomains.forEach((domain: string) => existingDomainsWithCMCLinks.add(domain.toLowerCase()));
  console.log('Existing CMC links count:', existingCMCLinks.size);

  const metadataMap = await getCMCMetadatas();
  const tagStats: any = {}
  const githubCoinsMap: any = {};
  const domainCoinsMap: any = {};
  const twitterCoinsMap: any = {};

  const coinCount = Object.values(metadataMap).length;
  let filteredCount = 0;
  let githubCount = 0;
  let domainCount = 0;
  let twitterCount = 0;

  Object.values(metadataMap).forEach((coin: any) => {
    if (!coin.metadata || coin.missingMetadata || ignoredCoinsSet.has(coin.id) || existingCMCLinks.has(coin.id)) return;
    let { tags, urls, name } = coin.metadata;
    if (!tags) tags = []
    if (tags.includes('memes') || tags.includes('pump-fun-ecosystem')) return;
    name = name.toLowerCase()
    if (['staked ', 'wrapped ', ' usd',].some((i: any) => name.includes(i))) return;
    filteredCount++;
    if (!urls) urls = {}

    tags.forEach((tag: string) => {
      if (!tagStats[tag]) tagStats[tag] = 0
      tagStats[tag]++;
    })
    const { source_code = [], website = [], twitter = [] } = urls

    if (twitter.length > 0) {
      const handles = twitter.map((handle: string) => handle.split('/').pop()?.toLowerCase());
      handles.forEach((handle: any) => {
        if (handle) {
          if (!twitterCoinsMap[handle]) twitterCoinsMap[handle] = [];
          twitterCoinsMap[handle] = [coin];
          twitterCount++;
        }
      })
    }


    if (source_code.length > 0) {
      const githubUrls = source_code.filter((url: string) => url.includes('github.com'));
      const handles = githubUrls.map((url: string) => url.split('/').slice(-1)[0].toLowerCase())
      handles.forEach((handle: any) => {
        if (handle) {
          if (!githubCoinsMap[handle]) githubCoinsMap[handle] = [];
          githubCoinsMap[handle] = [coin];
          githubCount++;
        }
      })
    }

    if (website.length > 0) {
      const handles = website.filter((url: string) => url.includes('://')).map(getDomain)
      handles.forEach((handle: any) => {
        if (existingDomainsWithCMCLinks.has(handle)) return; // Skip domains that already have CMC links
        if (!domainCoinsMap[handle]) domainCoinsMap[handle] = [];
        domainCoinsMap[handle] = [coin];
        domainCount++;
      })
    }


  })

  console.log({ coinCount, filteredCount, githubCount, domainCount, twitterCount });

  // console.table(Object.entries(tagStats).filter(([_, count]: any) => count > 10).sort((a: any, b: any) => b[1] - a[1]))


  let filteredProtocols = protocols.concat(chains).filter((protocol: any) => {
    if (hasCoinInfo(protocol)) return false
    if (processedParentProtocols.has(protocol.id)) return false
    const parentId = protocol.parentProtocol
    if (!parentId) return true
    if (processedParentProtocols.has(parentId)) return false
    const parentProtocol = parentProtocolsById[parentId]
    if (!parentProtocol) {
      console.warn('No parent protocol found for', protocol.name, 'with ID', parentId);
      return true; // Keep protocol if no parent found
    }
    protocol.parentProtocol = parentProtocol
    return !hasCoinInfo(parentProtocol)
  })
  console.log('Filtered protocols:', filteredProtocols.length, 'from', protocols.length, 'total protocols');

  const protocolsFound: any = {}
  filteredProtocols.forEach((protocol: any) => {
    let parentProtocol = parentProtocolsById[protocol.parentProtocol ?? ''] || {}
    let domain = protocol.url?.toLowerCase() || parentProtocol.url?.toLowerCase()

    if (domain && domain.includes('://')) {
      let domainKey = getDomain(domain)
      if (domainCoinsMap[domainKey]) {
        protocolsFound[protocol.id] = {
          protocol,
          domain: true,
          domainKey,
          coins: [...domainCoinsMap[domainKey]]
        }
      }
    }

    let twitterHandle = protocol.twitter?.toLowerCase() || parentProtocol.twitter?.toLowerCase()

    if (twitterHandle) {
      if (twitterCoinsMap[twitterHandle]) {
        if (!protocolsFound[protocol.id])
          protocolsFound[protocol.id] = {
            protocol,
            twitter: true,
            twitterHandle,
            coins: [...twitterCoinsMap[twitterHandle]]
          }
        else {
          protocolsFound[protocol.id].coins.push(...twitterCoinsMap[twitterHandle])
          protocolsFound[protocol.id].twitter = true
          protocolsFound[protocol.id].twitterHandle = twitterHandle

        }

      }
    }

    let githubHandles = protocol.github || parentProtocol.github

    if (githubHandles) {
      for (const handle of githubHandles) {
        let githubHandle = handle.toLowerCase()
        if (githubCoinsMap[githubHandle]) {
          if (!protocolsFound[protocol.id])
            protocolsFound[protocol.id] = {
              protocol,
              github: true,
              githubHandle,
              coins: [...githubCoinsMap[githubHandle]]
            }
          else {
            protocolsFound[protocol.id].coins.push(...githubCoinsMap[githubHandle])
            protocolsFound[protocol.id].github = true
            protocolsFound[protocol.id].githubHandle = githubHandle
          }
        }
      }
    }


  })


  console.log('Protocols found:', Object.keys(protocolsFound).length);
  const tableData = Object.values(protocolsFound).map((entry: any, idx: number) => {
    let coinSet = new Set<string>()
    let coins = entry.coins.filter((coin: any) => {
      if (coinSet.has(coin.id)) return false
      coinSet.add(coin.id)
      return true
    })
    return {
      idx: idx + 1,
      // id: entry.protocol.id,
      name: entry.protocol.name,
      // url: entry.protocol.url || entry.protocol.parentProtocol?.url,
      // twitter: entry.protocol.twitter || entry.protocol.parentProtocol?.twitter,
      // github: entry.protocol.github || entry.protocol.parentProtocol?.github,
      domainK: entry.domainKey ?? '',
      twitterK: entry.twitterHandle ?? '',
      // githubK: entry.githubHandle ?? '',
      coins: coins.map((coin: any) => coin.name.slice(0, 35)).join(', '),
      cmcIds: coins.map((coin: any) => coin.id).join(', '),
      category: entry.protocol.category
    }
  })

  // sort table data by domainK
  tableData.sort(sortTableData);

  if (!tableData.length) return;



  console.table(tableData)

  // if (process.env.UNLISTED_WEBHOOK) {
  //   const tableString = tableToString(tableData, Object.keys(tableData[0]))
  //   const message = `
  //   Protocols missing coin info (check and add coin info to the protocol/parent protocol):\n\n${tableString}\n\n
  //   Total: ${tableData.length} protocols
  //   To ignore coins from this list, add the cmc id here: https://github.com/DefiLlama/defillama-server/blob/master/defi/src/api2/scripts/checkForProtocolsMissingTokenInfo.ts#L45
  //   `
  //   await sendMessage(message, process.env.UNLISTED_WEBHOOK!, false)
  // }
}

async function getCGMetadatas() {

  const existingCGIDMaps = new Set(allMetadata.map((protocol: any) => protocol.cgId).filter((id: any) => id));
  const axiosInstance = axios.create({
    // baseURL: "https://pro-api.coingecko.com/api",
    baseURL: "https://api.coingecko.com/api",
    headers: {
      'x_cg_pro_api_key': process.env.CG_KEY
    },
  });
  const metadataMap: any = await getAllCGTokenMetadata();
  // let { data: coinMap } = await axiosInstance.get('/v3/coins/list', { params: { include_platform: true } });
  const coinMapString = fs.readFileSync('cg-coins.json', 'utf-8')
  let coinMap = JSON.parse(coinMapString);
  console.log('Fetched coin map from coingecko', coinMap.length, 'coins', 'already have metadata for', Object.keys(metadataMap).length, 'coins');
  // coinMap = coinMap.filter((coin: any) => coin.platforms && Object.keys(coin.platforms).length > 0 && ['wrapped ', 'coinbase', 'kraken', ' usd'].some((i: any) => coin.name.toLowerCase().includes(i)) && !existingCGIDMaps.has(coin.id));
  coinMap = coinMap.filter((coin: any) => !metadataMap[coin.id]);
  console.log('Filtered coin map to', coinMap.length, 'coins with platforms');

  let i0 = 0
  coinMap = coinMap
    .map((coin: any) => ({ coin, sort: Math.random() }))
    .sort((a: any, b: any) => a.sort - b.sort)
    .map(({ coin }: any) => coin);
  for (const coin of coinMap) {
    try {
      const { data: metadata } = await axiosInstance.get(`/v3/coins/${coin.id}`, { params: { market_data: false, localization: false, tickers: false, } })
      console.log(i0++, '/', coinMap.length, 'Fetched metadata for coin', coin.id, coin.name, Number(i0*100/coinMap.length).toFixed(3), '%', new Date().toISOString());
      await addCGTokenMetadatas([metadata])
      await sleep(3000)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response && error.response.status === 429) {
        // console.warn(`Too many requests for coin ${coin.id}, retrying after 60 seconds...`);
        await sleep(10000);
      } else {
        console.error(`Error fetching metadata for coin ${coin.id}:`);
        // throw error; // Re-throw the error to stop processing
      }
    }
  }

  return metadataMap
  coinMap.forEach((coin: any) => coin.id = '' + coin.id); // Ensure IDs are strings for consistency

  console.log('Filtered coin map to', coinMap.length, 'coins with platforms');
  const coinsMissingMetadata = coinMap.filter((coin: any) => !metadataMap[coin.id]);
  console.log('Coins missing metadata:', coinsMissingMetadata.length);
  const idChunks = sliceIntoChunks(coinsMissingMetadata, 99);
  console.log('Processing', idChunks.length, 'chunks of IDs');

  let i = 0
  for (const chunk of idChunks) {
    const coinIdMap: any = {}
    chunk.forEach((coin: any) => coinIdMap[coin.id] = coin)

    const { data: { data: metadataMap } } = await axiosInstance.get('/v1/cryptocurrency/info', {
      params: {
        id: chunk.map((coin: any) => coin.id).join(','),
        skip_invalid: true
      }
    });

    console.log(i++, 'Fetched metadata for chunk', chunk.length, 'coins', Object.keys(metadataMap).length, 'metadata entries found');

    for (const id of Object.keys(metadataMap)) {
      if (!coinIdMap[id]) {
        console.log(id, metadataMap[id])
        console.log('Coin ID not found in chunk:', id);
      } else coinIdMap[id].metadata = metadataMap[id]
    }

    chunk.forEach((coin: any) => {
      if (!coin.metadata) {
        console.log('No metadata for coin', coin.id, coin.name);
        coin.metadata = {}
        coin.missingMetadata = true
      }
      metadataMap[coin.id] = coin
    })

    console.log('Chunk processed, writing cmc metadata to db', chunk.length);
    await addCMCTokenMetadatas(chunk)


  }

  return metadataMap
}


const getDomain = (url: string) => {
  // console.log('getDomain', url)
  return url.split('://')[1].split('/')[0].split('.').slice(-2).join('.').toLowerCase()
}


getCGMetadatas().catch(err => {
  console.error('Error:', err);
}).then(() => process.exit(0))
